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

	user, err := h.db.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	if user.Role != "seller" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only seller accounts can create listings"})
		return
	}

	var req models.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product data", "details": err.Error()})
		return
	}

	lifecycleData := buildLifecycleData(req)
	reusePotential := calculateReusePotential(lifecycleData)
	carbonSaved, carbonSource := estimateCarbonSaved(lifecycleData, req.Category)
	lifecycleData.CarbonSaved = carbonSaved
	lifecycleData.CarbonSource = carbonSource

	product := &models.Product{
		SellerID: userID, SellerName: user.DisplayName,
		Title: req.Title, Description: req.Description,
		Category: req.Category, Condition: req.Condition,
		BasePrice: req.BasePrice, ImageURLs: req.ImageURLs,
		LifecycleData:  lifecycleData,
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

	user, err := h.db.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	if user.Role != "seller" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only seller accounts can update listings"})
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

	user, err := h.db.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	if user.Role != "seller" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only seller accounts can archive listings"})
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

// MyListings handles GET /api/products/my-listings
func (h *ProductHandler) MyListings(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	products := h.db.GetUserProducts(userID, true) // include archived

	for _, p := range products {
		breakdown := h.pricing.CalculatePrice(p)
		p.DynamicPrice = breakdown.FinalPrice
		p.PricingBreakdown = &breakdown
	}

	c.JSON(http.StatusOK, gin.H{"products": products, "total": len(products)})
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

// LCA-backed manufacturing CO₂ baselines (kg CO₂e per new product).
// Sources:
//   - Electronics: Apple Product Environmental Reports (2023), EU JRC ILCD Handbook
//   - Furniture: EPA WARM Model v15, UNEP Life Cycle Initiative
//   - Clothing: WRAP UK "Valuing Our Clothes" Report (2017), Quantis World Apparel LCA (2018)
//   - Appliances: EU Ecodesign Directive preparatory studies, IEA 4E Mapping & Benchmarking
//   - Books: Green Press Initiative, EPA WARM Model v15
//   - Sports/Toys: Industry-average LCA estimates, Ellen MacArthur Foundation
//   - Automotive: EPA WARM Model v15, GREET Model (Argonne National Lab)
var lcaManufacturingBaseline = map[string]float64{
	"electronics": 85.0, // Weighted average: smartphone ~70kg, laptop ~300kg, tablet ~100kg
	"furniture":   47.0, // Wooden furniture avg per EPA WARM model
	"clothing":    22.0, // Average garment lifecycle per WRAP UK / Quantis study
	"appliances":  55.0, // Household appliance avg per EU Ecodesign studies
	"books":       4.5,  // Per-book avg per EPA WARM / Green Press Initiative
	"sports":      18.0, // Industry LCA avg for sporting goods
	"toys":        8.0,  // Average plastic/mixed-material toy
	"automotive":  90.0, // Auto parts avg per EPA WARM / GREET model
	"other":       15.0,
}

// Average product weight per category (kg). Used as reference when seller provides weight.
var avgCategoryWeight = map[string]float64{
	"electronics": 3.0,
	"furniture":   25.0,
	"clothing":    0.8,
	"appliances":  20.0,
	"books":       0.4,
	"sports":      5.0,
	"toys":        1.2,
	"automotive":  8.0,
	"other":       3.0,
}

// LCA-backed recyclability baselines (%).
var lcaRecyclabilityBaseline = map[string]int{
	"electronics": 62,
	"furniture":   81,
	"clothing":    56,
	"appliances":  68,
	"books":       92,
	"sports":      60,
	"toys":        48,
	"automotive":  74,
	"other":       55,
}

func buildLifecycleData(req models.CreateProductRequest) models.LifecycleData {
	// If expert data is provided, use it but recalculate carbon via our formula
	if req.LifecycleData != nil {
		ld := *req.LifecycleData
		// Do NOT trust seller-provided CarbonSaved — we always recalculate
		ld.CarbonSaved = 0
		return ld
	}

	hints := req.LifecycleHints
	usageMonths := 12
	usageIntensity := "moderate"
	refurbished := false
	hasRepairs := false
	weightKg := 0.0

	if hints != nil {
		if hints.UsageMonths > 0 {
			usageMonths = hints.UsageMonths
		}
		if hints.UsageIntensity != "" {
			usageIntensity = hints.UsageIntensity
		}
		refurbished = hints.Refurbished
		hasRepairs = hints.HasRepairs
		weightKg = hints.WeightKg
	}

	impact := lcaManufacturingBaseline[req.Category]
	if impact == 0 {
		impact = lcaManufacturingBaseline["other"]
	}

	recyclability := lcaRecyclabilityBaseline[req.Category]
	if recyclability == 0 {
		recyclability = lcaRecyclabilityBaseline["other"]
	}

	conditionQuality := map[string]int{
		"like_new": 90,
		"good":     76,
		"fair":     61,
		"poor":     42,
	}

	conditionReuse := map[string]int{
		"like_new": 5,
		"good":     4,
		"fair":     3,
		"poor":     2,
	}

	refurbishmentQuality := conditionQuality[req.Condition]
	if refurbishmentQuality == 0 {
		refurbishmentQuality = 70
	}

	expectedReuseCycles := conditionReuse[req.Condition]
	if expectedReuseCycles == 0 {
		expectedReuseCycles = 3
	}

	switch usageIntensity {
	case "light":
		refurbishmentQuality += 6
		expectedReuseCycles++
	case "heavy":
		refurbishmentQuality -= 8
		expectedReuseCycles--
	}

	if usageMonths > 36 {
		refurbishmentQuality -= 6
		expectedReuseCycles--
	} else if usageMonths < 12 {
		refurbishmentQuality += 4
	}

	if refurbished {
		refurbishmentQuality += 12
		expectedReuseCycles++
		recyclability += 4
	}

	if hasRepairs {
		refurbishmentQuality += 4
		expectedReuseCycles++
	}

	if refurbishmentQuality < 25 {
		refurbishmentQuality = 25
	}
	if refurbishmentQuality > 96 {
		refurbishmentQuality = 96
	}
	if expectedReuseCycles < 1 {
		expectedReuseCycles = 1
	}
	if recyclability < 30 {
		recyclability = 30
	}
	if recyclability > 95 {
		recyclability = 95
	}

	return models.LifecycleData{
		ManufacturingImpact:   impact,
		UsageMonths:           usageMonths,
		RefurbishmentQuality:  refurbishmentQuality,
		ExpectedReuseCycles:   expectedReuseCycles,
		MaterialRecyclability: recyclability,
		WeightKg:              weightKg,
	}
}

// estimateCarbonSaved calculates how much CO₂ is avoided by reusing this product
// instead of manufacturing a new one.
//
// Formula:
//
//	carbonSaved = lcaBaseline × weightMultiplier × qualityFactor × (1 / expectedReuseCycles)
//
// Where:
//   - lcaBaseline: Category-specific CO₂ from manufacturing a new product (LCA studies)
//   - weightMultiplier: (productWeight / avgCategoryWeight), defaults to 1.0 if weight unknown
//     Heavier items within a category save proportionally more carbon.
//   - qualityFactor: refurbishmentQuality / 100 — higher quality = more of the original
//     manufacturing emissions are genuinely avoided.
//   - reuseDivisor: 1 / expectedReuseCycles — the carbon saving is amortized across
//     how many times this item can realistically be resold before end-of-life.
//
// This follows the "avoided burden" methodology used in ISO 14044 LCA standards.
func estimateCarbonSaved(ld models.LifecycleData, category string) (float64, string) {
	baseline, exists := lcaManufacturingBaseline[category]
	if !exists {
		baseline = lcaManufacturingBaseline["other"]
	}

	// Weight multiplier: adjusts baseline by actual product weight vs category average
	weightMultiplier := 1.0
	avgWeight := avgCategoryWeight[category]
	if avgWeight == 0 {
		avgWeight = avgCategoryWeight["other"]
	}
	if ld.WeightKg > 0 && avgWeight > 0 {
		weightMultiplier = ld.WeightKg / avgWeight
		// Clamp to reasonable range (0.2x to 5.0x)
		if weightMultiplier < 0.2 {
			weightMultiplier = 0.2
		}
		if weightMultiplier > 5.0 {
			weightMultiplier = 5.0
		}
	}

	qualityFactor := float64(ld.RefurbishmentQuality) / 100.0

	// Amortize savings across expected reuse cycles (avoided burden per cycle)
	reuseDivisor := float64(ld.ExpectedReuseCycles)
	if reuseDivisor < 1 {
		reuseDivisor = 1
	}

	carbonSaved := baseline * weightMultiplier * qualityFactor / reuseDivisor

	// Build source citation
	source := "Estimated via avoided-burden LCA method (ISO 14044). "
	source += "Manufacturing baseline from EPA WARM Model, EU Ecodesign, and industry LCA data. "
	if ld.WeightKg > 0 {
		source += "Weight-adjusted using seller-provided product weight."
	} else {
		source += "Using category-average weight (no product weight provided)."
	}

	return carbonSaved, source
}
