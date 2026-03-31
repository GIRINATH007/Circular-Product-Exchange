package models

import "time"

// LifecycleData contains the environmental impact data for a product.
type LifecycleData struct {
	ManufacturingImpact   float64 `json:"manufacturingImpact"`   // CO2 kg from manufacturing a new equivalent
	UsageMonths           int     `json:"usageMonths"`           // How long it's been used
	RefurbishmentQuality  int     `json:"refurbishmentQuality"`  // 1-100 quality score
	ExpectedReuseCycles   int     `json:"expectedReuseCycles"`   // Remaining reuse potential
	MaterialRecyclability int     `json:"materialRecyclability"` // 1-100 recyclability
	CarbonSaved           float64 `json:"carbonSaved"`           // CO2 saved vs buying new
	WeightKg              float64 `json:"weightKg"`              // Product weight in kg
	CarbonSource          string  `json:"carbonSource"`          // Estimation method used
}

// LifecycleHints are user-friendly inputs used to estimate sustainability values.
type LifecycleHints struct {
	UsageMonths    int     `json:"usageMonths"`
	UsageIntensity string  `json:"usageIntensity"` // "light", "moderate", "heavy"
	Refurbished    bool    `json:"refurbished"`
	HasRepairs     bool    `json:"hasRepairs"`
	WeightKg       float64 `json:"weightKg"` // Product weight in kg
}

// Product represents a marketplace listing.
type Product struct {
	ID               string            `json:"id"`
	SellerID         string            `json:"sellerId"`
	SellerName       string            `json:"sellerName"`
	Title            string            `json:"title"`
	Description      string            `json:"description"`
	Category         string            `json:"category"`
	Condition        string            `json:"condition"` // "like_new", "good", "fair", "poor"
	BasePrice        float64           `json:"basePrice"`
	DynamicPrice     float64           `json:"dynamicPrice"`
	ImageURLs        []string          `json:"imageUrls"`
	LifecycleData    LifecycleData     `json:"lifecycleData"`
	ReusePotential   int               `json:"reusePotential"` // 1-100 overall score
	Status           string            `json:"status"`         // "active", "sold", "archived"
	CreatedAt        time.Time         `json:"createdAt"`
	PricingBreakdown *PricingBreakdown `json:"pricingBreakdown,omitempty"`
	SavingsVsNew     float64           `json:"savingsVsNew,omitempty"`
}

// CreateProductRequest is sent by sellers when listing a product.
type CreateProductRequest struct {
	Title         string        `json:"title" binding:"required,min=3"`
	Description   string        `json:"description" binding:"required,min=10"`
	Category      string        `json:"category" binding:"required,oneof=electronics furniture clothing appliances books sports toys automotive other"`
	Condition     string        `json:"condition" binding:"required,oneof=like_new good fair poor"`
	BasePrice     float64       `json:"basePrice" binding:"required,gt=0"`
	ImageURLs     []string      `json:"imageUrls"`
	LifecycleData *LifecycleData `json:"lifecycleData,omitempty"`
	LifecycleHints *LifecycleHints `json:"lifecycleHints,omitempty"`
}

// UpdateProductRequest allows sellers to update their listing.
type UpdateProductRequest struct {
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	BasePrice     float64        `json:"basePrice"`
	ImageURLs     []string       `json:"imageUrls"`
	LifecycleData *LifecycleData `json:"lifecycleData"`
	Status        string         `json:"status"`
}

// ProductFilter is used for search/filter queries.
type ProductFilter struct {
	Category    string  `form:"category"`
	Condition   string  `form:"condition"`
	MinPrice    float64 `form:"minPrice"`
	MaxPrice    float64 `form:"maxPrice"`
	SearchQuery string  `form:"q"`
	SortBy      string  `form:"sortBy"` // "price_asc", "price_desc", "newest", "sustainability"
	Page        int     `form:"page"`
	Limit       int     `form:"limit"`
}
