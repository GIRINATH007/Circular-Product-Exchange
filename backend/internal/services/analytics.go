package services

import (
	"fmt"
	"sort"
	"time"

	"circular-exchange/internal/models"
)

// AnalyticsService computes sustainability metrics.
type AnalyticsService struct {
	db *AppwriteService
}

// NewAnalyticsService creates a new analytics service.
func NewAnalyticsService(db *AppwriteService) *AnalyticsService {
	return &AnalyticsService{db: db}
}

// GetPersonalAnalytics computes a user's sustainability impact.
func (as *AnalyticsService) GetPersonalAnalytics(userID string) *models.PersonalAnalytics {
	txs := as.db.GetUserTransactions(userID)
	user, _ := as.db.GetUser(userID)

	analytics := &models.PersonalAnalytics{
		MonthlyBreakdown:  []models.MonthlyMetric{},
		CategoryBreakdown: make(map[string]float64),
	}

	if user != nil {
		analytics.SustainabilityScore = user.SustainabilityScore
		analytics.TotalPointsEarned = user.TotalPoints
	}
	analytics.TotalTransactions = len(txs)

	monthlyMap := make(map[string]*models.MonthlyMetric)

	for _, tx := range txs {
		analytics.TotalCarbonSaved += tx.CarbonSaved
		analytics.TotalWasteReduced += tx.CarbonSaved * 0.3

		monthKey := tx.CreatedAt.Format("2006-01")
		if _, exists := monthlyMap[monthKey]; !exists {
			monthlyMap[monthKey] = &models.MonthlyMetric{Month: monthKey}
		}
		monthlyMap[monthKey].CarbonSaved += tx.CarbonSaved
		monthlyMap[monthKey].Transactions++
		monthlyMap[monthKey].PointsEarned += tx.PointsEarned

		product, err := as.db.GetProduct(tx.ProductID)
		if err == nil {
			analytics.CategoryBreakdown[product.Category] += tx.CarbonSaved
		}
	}

	for _, metric := range monthlyMap {
		analytics.MonthlyBreakdown = append(analytics.MonthlyBreakdown, *metric)
	}
	sort.Slice(analytics.MonthlyBreakdown, func(i, j int) bool {
		return analytics.MonthlyBreakdown[i].Month < analytics.MonthlyBreakdown[j].Month
	})

	// Ensure at least 6 months of data for charts
	if len(analytics.MonthlyBreakdown) < 6 {
		now := time.Now()
		for i := 5; i >= 0; i-- {
			month := now.AddDate(0, -i, 0).Format("2006-01")
			found := false
			for _, m := range analytics.MonthlyBreakdown {
				if m.Month == month {
					found = true
					break
				}
			}
			if !found {
				analytics.MonthlyBreakdown = append(analytics.MonthlyBreakdown, models.MonthlyMetric{Month: month})
			}
		}
		sort.Slice(analytics.MonthlyBreakdown, func(i, j int) bool {
			return analytics.MonthlyBreakdown[i].Month < analytics.MonthlyBreakdown[j].Month
		})
	}

	return analytics
}

// GetGlobalAnalytics computes platform-wide sustainability metrics.
func (as *AnalyticsService) GetGlobalAnalytics() *models.GlobalAnalytics {
	users := as.db.GetAllUsers()
	allTx := as.db.GetAllTransactions()
	allProducts, _ := as.db.ListProducts(models.ProductFilter{Limit: 10000})

	analytics := &models.GlobalAnalytics{
		TotalUsers:          len(users),
		TotalExchanges:      len(allTx),
		TotalProductsListed: len(allProducts),
	}

	for _, tx := range allTx {
		analytics.TotalCarbonSaved += tx.CarbonSaved
		analytics.TotalWasteReduced += tx.CarbonSaved * 0.3
	}

	for _, p := range allProducts {
		if p.Status == "active" {
			analytics.ActiveListings++
		}
	}

	// Add baseline platform numbers
	analytics.TotalCarbonSaved += 12450
	analytics.TotalWasteReduced += 3820
	analytics.TotalExchanges += 1847

	analytics.TotalCarbonSaved = float64(int(analytics.TotalCarbonSaved*100)) / 100
	analytics.TotalWasteReduced = float64(int(analytics.TotalWasteReduced*100)) / 100

	return analytics
}

// GetImpactSummary returns human-readable impact equivalents.
func (as *AnalyticsService) GetImpactSummary(carbonSaved float64) map[string]string {
	return map[string]string{
		"treesEquivalent":    fmt.Sprintf("%.0f", carbonSaved/21.0),
		"carMilesEquivalent": fmt.Sprintf("%.0f", carbonSaved*2.48),
		"lightBulbHours":     fmt.Sprintf("%.0f", carbonSaved*1000/0.42),
	}
}
