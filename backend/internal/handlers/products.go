package handlers

import (
	"net/http"

	"circular-exchange/internal/middleware"
	"circular-exchange/internal/models"
	"circular-exchange/internal/services"

	"github.com/gin-gonic/gin"
)

// ProductHandler handles product-related HTTP requests.
type ProductHandler struct {
	db      *services.AppwriteService
	pricing *services.PricingEngine
	gamify  *services.GamificationService
}

// NewProductHandler creates a new product handler.
func NewProductHandler(db *services.AppwriteService, pricing *services.PricingEngine, gamify *services.GamificationService) *ProductHandler {
	return &ProductHandler{db: db, pricing: pricing, gamify: gamify}
}

// ListProducts handles GET /api/products
func (h *ProductHandler) ListProducts(c *gin.Context) {
	var filter models.ProductFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filter parameters"})
		return
	}

	products, total := h.db.ListProducts(filter)

	for _, p := range products {
		breakdown := h.pricing.CalculatePrice(p)
		p.DynamicPrice = breakdown.FinalPrice
		p.PricingBreakdown = &breakdown
		p.SavingsVsNew = breakdown.SavingsVsNewProduct
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products, "total": total,
		"page": filter.Page, "limit": filter.Limit,
	})
}

// GetProduct handles GET /api/products/:id
func (h *ProductHandler) GetProduct(c *gin.Context) {
	productID := c.Param("id")

	product, err := h.db.GetProduct(productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	breakdown := h.pricing.CalculatePrice(product)
	product.DynamicPrice = breakdown.FinalPrice
	product.PricingBreakdown = &breakdown
	product.SavingsVsNew = breakdown.SavingsVsNewProduct

	c.JSON(http.StatusOK, product)
}

// CreateProduct handles POST /api/products
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req models.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product data", "details": err.Error()})
		return
	}

	seller, _ := h.db.GetUser(userID)
	sellerName := "Unknown"
	if seller != nil {
		sellerName = seller.DisplayName
	}

	reusePotential := calculateReusePotential(req.LifecycleData)
	carbonSaved := estimateCarbonSaved(req.LifecycleData, req.Category)

	product := &models.Product{
		SellerID: userID, SellerName: sellerName,
		Title: req.Title, Description: req.Description,
		Category: req.Category, Condition: req.Condition,
		BasePrice: req.BasePrice, ImageURLs: req.ImageURLs,
		LifecycleData: models.LifecycleData{
			ManufacturingImpact: req.LifecycleData.ManufacturingImpact,
			UsageMonths: req.LifecycleData.UsageMonths,
			RefurbishmentQuality: req.LifecycleData.RefurbishmentQuality,
			ExpectedReuseCycles: req.LifecycleData.ExpectedReuseCycles,
			MaterialRecyclability: req.LifecycleData.MaterialRecyclability,
			CarbonSaved: carbonSaved,
		},
		ReusePotential: reusePotential,
	}

	created, err := h.db.CreateProduct(product)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	breakdown := h.pricing.CalculatePrice(created)
	created.DynamicPrice = breakdown.FinalPrice
	created.PricingBreakdown = &breakdown

	c.JSON(http.StatusCreated, created)
}

// UpdateProduct handles PUT /api/products/:id
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	productID := c.Param("id")
	product, err := h.db.GetProduct(productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only edit your own listings"})
		return
	}

	var req models.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid update data"})
		return
	}

	updated, err := h.db.UpdateProduct(productID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	breakdown := h.pricing.CalculatePrice(updated)
	updated.DynamicPrice = breakdown.FinalPrice
	updated.PricingBreakdown = &breakdown

	c.JSON(http.StatusOK, updated)
}

// DeleteProduct handles DELETE /api/products/:id
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	productID := c.Param("id")
	product, err := h.db.GetProduct(productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own listings"})
		return
	}

	if err := h.db.DeleteProduct(productID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.Status(http.StatusNoContent)
}

// PurchaseProduct handles POST /api/products/:id/purchase
func (h *ProductHandler) PurchaseProduct(c *gin.Context) {
	buyerID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	productID := c.Param("id")
	product, err := h.db.GetProduct(productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is no longer available"})
		return
	}

	if product.SellerID == buyerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot buy your own product"})
		return
	}

	breakdown := h.pricing.CalculatePrice(product)
	pointsEarned := h.gamify.CalculatePointsForTransaction(product.LifecycleData.CarbonSaved, breakdown.FinalPrice)

	tx := &models.Transaction{
		ProductID: productID, BuyerID: buyerID, SellerID: product.SellerID,
		FinalPrice: breakdown.FinalPrice, CarbonSaved: product.LifecycleData.CarbonSaved,
		PointsEarned: pointsEarned,
	}

	createdTx, err := h.db.CreateTransaction(tx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	h.db.UpdateProduct(productID, models.UpdateProductRequest{Status: "sold"})

	sustainabilityDelta := h.gamify.CalculateSustainabilityDelta(product.LifecycleData.CarbonSaved)
	h.db.UpdateUserScore(buyerID, pointsEarned, sustainabilityDelta)
	h.db.UpdateUserScore(product.SellerID, pointsEarned/2, sustainabilityDelta/2)

	buyerBadges := h.gamify.CheckAndAwardBadges(buyerID)
	h.gamify.CheckAndAwardBadges(product.SellerID)

	c.JSON(http.StatusOK, gin.H{
		"transaction": createdTx, "pointsEarned": pointsEarned,
		"newBadges": buyerBadges, "message": "Purchase successful! Thank you for choosing sustainable.",
	})
}

// GetCategories handles GET /api/products/categories
func (h *ProductHandler) GetCategories(c *gin.Context) {
	counts := h.db.GetProductsByCategory()
	categories := []gin.H{
		{"id": "electronics", "name": "Electronics", "icon": "💻", "count": counts["electronics"]},
		{"id": "furniture", "name": "Furniture", "icon": "🪑", "count": counts["furniture"]},
		{"id": "clothing", "name": "Clothing", "icon": "👕", "count": counts["clothing"]},
		{"id": "appliances", "name": "Appliances", "icon": "🔌", "count": counts["appliances"]},
		{"id": "books", "name": "Books", "icon": "📚", "count": counts["books"]},
		{"id": "sports", "name": "Sports", "icon": "⚽", "count": counts["sports"]},
		{"id": "toys", "name": "Toys", "icon": "🧸", "count": counts["toys"]},
		{"id": "automotive", "name": "Automotive", "icon": "🚗", "count": counts["automotive"]},
		{"id": "other", "name": "Other", "icon": "📦", "count": counts["other"]},
	}
	c.JSON(http.StatusOK, categories)
}

// --- Helper functions ---

func calculateReusePotential(ld models.LifecycleData) int {
	score := 0.0
	score += float64(ld.RefurbishmentQuality) * 0.35
	score += float64(ld.ExpectedReuseCycles) * 8.0
	score += float64(ld.MaterialRecyclability) * 0.25
	if score > 100 {
		score = 100
	}
	return int(score)
}

func estimateCarbonSaved(ld models.LifecycleData, category string) float64 {
	categoryBaseline := map[string]float64{
		"electronics": 100.0, "furniture": 40.0, "clothing": 20.0,
		"appliances": 50.0, "books": 5.0, "sports": 15.0,
		"toys": 10.0, "automotive": 80.0, "other": 15.0,
	}

	baseline, exists := categoryBaseline[category]
	if !exists {
		baseline = 15.0
	}

	qualityFactor := float64(ld.RefurbishmentQuality) / 100.0
	reuseFactor := float64(ld.ExpectedReuseCycles) / 3.0

	if ld.CarbonSaved > 0 {
		return ld.CarbonSaved
	}
	return baseline * qualityFactor * reuseFactor
}
