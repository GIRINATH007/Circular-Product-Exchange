package services

import (
	"math"
	"time"

	"circular-exchange/internal/models"
)

// PricingEngine calculates dynamic prices for products.
type PricingEngine struct {
	db     *AppwriteService
	config models.PricingConfig
}

// NewPricingEngine creates a new pricing engine instance.
func NewPricingEngine(db *AppwriteService) *PricingEngine {
	return &PricingEngine{
		db:     db,
		config: models.DefaultPricingConfig(),
	}
}

// CalculatePrice computes the dynamic price and returns a detailed breakdown.
func (pe *PricingEngine) CalculatePrice(product *models.Product) models.PricingBreakdown {
	// Step 1: Lifecycle Score (0-100)
	lifecycleScore := pe.calculateLifecycleScore(product)

	// Step 2: Convert to price multiplier (0.5 to 1.2)
	lifecycleMultiplier := 0.5 + (lifecycleScore/100.0)*0.7

	// Step 3: Demand Factor (0.8 to 1.3)
	demandFactor := pe.calculateDemandFactor(product.Category)

	// Step 4: Sustainability Discount (0 to 25%)
	sustainabilityDiscount := pe.calculateSustainabilityDiscount(product)

	// Step 5: Time Decay (0 to 15%)
	timeDecay := pe.calculateTimeDecay(product.CreatedAt)

	// Step 6: Final price calculation
	finalPrice := product.BasePrice *
		lifecycleMultiplier *
		demandFactor *
		(1 - sustainabilityDiscount) *
		(1 - timeDecay)

	finalPrice = math.Round(finalPrice*100) / 100

	// Enforce minimum of 10% of base price
	minPrice := product.BasePrice * 0.10
	if finalPrice < minPrice {
		finalPrice = minPrice
	}

	// Calculate savings vs buying new
	newProductPrice := pe.estimateNewPrice(product)
	savingsVsNew := 0.0
	if newProductPrice > 0 {
		savingsVsNew = math.Round(((newProductPrice-finalPrice)/newProductPrice)*10000) / 100
	}

	return models.PricingBreakdown{
		BasePrice:              product.BasePrice,
		LifecycleScore:         lifecycleScore,
		LifecycleMultiplier:    lifecycleMultiplier,
		DemandFactor:           demandFactor,
		SustainabilityDiscount: sustainabilityDiscount,
		TimeDecay:              timeDecay,
		FinalPrice:             finalPrice,
		CarbonSavings:          product.LifecycleData.CarbonSaved,
		SavingsVsNewProduct:    savingsVsNew,
	}
}

// calculateLifecycleScore produces a 0-100 weighted score.
func (pe *PricingEngine) calculateLifecycleScore(product *models.Product) float64 {
	ld := product.LifecycleData
	cfg := pe.config

	refurbScore := float64(ld.RefurbishmentQuality) * cfg.RefurbishmentWeight
	reuseScore := math.Min(float64(ld.ExpectedReuseCycles)*20, 100) * cfg.ReusePotentialWeight
	recyclabilityScore := float64(ld.MaterialRecyclability) * cfg.RecyclabilityWeight
	impactNormalized := math.Max(0, 100-ld.ManufacturingImpact/5)
	manufacturingScore := impactNormalized * cfg.ManufacturingWeight

	conditionBonus := 0.0
	switch product.Condition {
	case "like_new":
		conditionBonus = 10
	case "good":
		conditionBonus = 5
	case "fair":
		conditionBonus = 0
	case "poor":
		conditionBonus = -10
	}

	total := refurbScore + reuseScore + recyclabilityScore + manufacturingScore + conditionBonus
	return math.Max(0, math.Min(100, total))
}

// calculateDemandFactor adjusts price based on supply/demand.
func (pe *PricingEngine) calculateDemandFactor(category string) float64 {
	supply := pe.db.GetProductCountByCategory(category)

	demandWeights := map[string]float64{
		"electronics": 1.15, "furniture": 1.05, "clothing": 1.00,
		"appliances": 1.10, "books": 0.90, "sports": 1.05,
		"toys": 0.95, "automotive": 1.20, "other": 1.00,
	}

	baseDemand, exists := demandWeights[category]
	if !exists {
		baseDemand = 1.0
	}

	supplyFactor := 1.0
	if supply < 5 {
		supplyFactor = 1.1
	} else if supply > 20 {
		supplyFactor = 0.9
	}

	factor := baseDemand * supplyFactor
	return math.Max(pe.config.MinDemandFactor, math.Min(pe.config.MaxDemandFactor, factor))
}

// calculateSustainabilityDiscount gives a discount for eco-friendly choices.
func (pe *PricingEngine) calculateSustainabilityDiscount(product *models.Product) float64 {
	carbonSaved := product.LifecycleData.CarbonSaved
	if carbonSaved <= 0 {
		return 0
	}

	normalized := carbonSaved / 300.0
	if normalized > 1 {
		normalized = 1
	}

	// Square root curve for diminishing returns
	discount := math.Sqrt(normalized) * pe.config.MaxSustainabilityDiscount
	return math.Min(discount, pe.config.MaxSustainabilityDiscount)
}

// calculateTimeDecay reduces price for items listed too long.
func (pe *PricingEngine) calculateTimeDecay(createdAt time.Time) float64 {
	daysSinceListing := int(time.Since(createdAt).Hours() / 24)
	if daysSinceListing < pe.config.TimeDecayStartDays {
		return 0
	}

	weeksOverdue := float64(daysSinceListing-pe.config.TimeDecayStartDays) / 7.0
	decay := weeksOverdue * 0.01
	return math.Min(decay, pe.config.MaxTimeDecay)
}

// estimateNewPrice estimates the brand-new product price for comparison.
func (pe *PricingEngine) estimateNewPrice(product *models.Product) float64 {
	conditionMultiplier := 1.0
	switch product.Condition {
	case "like_new":
		conditionMultiplier = 1.25
	case "good":
		conditionMultiplier = 1.60
	case "fair":
		conditionMultiplier = 2.20
	case "poor":
		conditionMultiplier = 3.00
	}
	return product.BasePrice * conditionMultiplier
}

// RecalculateAllPrices updates dynamic prices for all active products.
func (pe *PricingEngine) RecalculateAllPrices() {
	products, _ := pe.db.ListProducts(models.ProductFilter{Limit: 1000})
	for _, product := range products {
		breakdown := pe.CalculatePrice(product)
		product.DynamicPrice = breakdown.FinalPrice
		product.PricingBreakdown = &breakdown
	}
}
