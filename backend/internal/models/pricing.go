package models

// PricingBreakdown explains how the dynamic price was calculated.
type PricingBreakdown struct {
	BasePrice              float64 `json:"basePrice"`
	LifecycleScore         float64 `json:"lifecycleScore"`          // 0-100
	LifecycleMultiplier    float64 `json:"lifecycleMultiplier"`     // 0.5 to 1.2
	DemandFactor           float64 `json:"demandFactor"`            // 0.8 to 1.3
	SustainabilityDiscount float64 `json:"sustainabilityDiscount"`  // 0 to 0.25
	TimeDecay              float64 `json:"timeDecay"`               // 0 to 0.15
	FinalPrice             float64 `json:"finalPrice"`
	CarbonSavings          float64 `json:"carbonSavings"`           // kg CO2
	SavingsVsNewProduct    float64 `json:"savingsVsNewProduct"`     // percentage
}

// PricingConfig holds the tunable parameters for the pricing algorithm.
type PricingConfig struct {
	RefurbishmentWeight       float64
	ReusePotentialWeight      float64
	RecyclabilityWeight       float64
	ManufacturingWeight       float64
	MinDemandFactor           float64
	MaxDemandFactor           float64
	MaxSustainabilityDiscount float64
	TimeDecayStartDays        int
	MaxTimeDecay              float64
}

// DefaultPricingConfig returns sensible defaults for the pricing engine.
func DefaultPricingConfig() PricingConfig {
	return PricingConfig{
		RefurbishmentWeight:       0.35,
		ReusePotentialWeight:      0.25,
		RecyclabilityWeight:       0.20,
		ManufacturingWeight:       0.20,
		MinDemandFactor:           0.80,
		MaxDemandFactor:           1.30,
		MaxSustainabilityDiscount: 0.25,
		TimeDecayStartDays:        30,
		MaxTimeDecay:              0.15,
	}
}
