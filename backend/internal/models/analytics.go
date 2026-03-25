package models

import "time"

// Transaction records a completed exchange between buyer and seller.
type Transaction struct {
	ID           string    `json:"id"`
	ProductID    string    `json:"productId"`
	BuyerID      string    `json:"buyerId"`
	SellerID     string    `json:"sellerId"`
	FinalPrice   float64   `json:"finalPrice"`
	CarbonSaved  float64   `json:"carbonSaved"`
	PointsEarned int       `json:"pointsEarned"`
	CreatedAt    time.Time `json:"createdAt"`
}

// PersonalAnalytics shows a user's individual sustainability impact.
type PersonalAnalytics struct {
	TotalCarbonSaved    float64            `json:"totalCarbonSaved"`
	TotalWasteReduced   float64            `json:"totalWasteReduced"`
	TotalTransactions   int                `json:"totalTransactions"`
	TotalPointsEarned   int                `json:"totalPointsEarned"`
	SustainabilityScore int                `json:"sustainabilityScore"`
	MonthlyBreakdown    []MonthlyMetric    `json:"monthlyBreakdown"`
	CategoryBreakdown   map[string]float64 `json:"categoryBreakdown"`
}

// MonthlyMetric tracks sustainability impact per month for charts.
type MonthlyMetric struct {
	Month        string  `json:"month"`
	CarbonSaved  float64 `json:"carbonSaved"`
	Transactions int     `json:"transactions"`
	PointsEarned int     `json:"pointsEarned"`
}

// GlobalAnalytics shows platform-wide sustainability metrics.
type GlobalAnalytics struct {
	TotalCarbonSaved    float64 `json:"totalCarbonSaved"`
	TotalWasteReduced   float64 `json:"totalWasteReduced"`
	TotalProductsListed int     `json:"totalProductsListed"`
	TotalExchanges      int     `json:"totalExchanges"`
	TotalUsers          int     `json:"totalUsers"`
	ActiveListings      int     `json:"activeListings"`
}

// Badge represents an achievement a user can earn.
type Badge struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Tier        string `json:"tier"`      // "bronze", "silver", "gold", "platinum"
	Criteria    string `json:"criteria"`
	Threshold   int    `json:"threshold"`
}

// LeaderboardEntry is a single row in the leaderboard.
type LeaderboardEntry struct {
	Rank                int     `json:"rank"`
	UserID              string  `json:"userId"`
	DisplayName         string  `json:"displayName"`
	AvatarURL           string  `json:"avatarUrl"`
	SustainabilityScore int     `json:"sustainabilityScore"`
	TotalCarbonSaved    float64 `json:"totalCarbonSaved"`
	BadgeCount          int     `json:"badgeCount"`
}

// GamificationProgress tracks a user's gamification status.
type GamificationProgress struct {
	CurrentPoints   int     `json:"currentPoints"`
	Level           int     `json:"level"`
	LevelName       string  `json:"levelName"`
	NextLevelPoints int     `json:"nextLevelPoints"`
	EarnedBadges    []Badge `json:"earnedBadges"`
	AvailableBadges []Badge `json:"availableBadges"`
	Rank            int     `json:"rank"`
}
