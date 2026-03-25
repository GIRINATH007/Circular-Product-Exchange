package services

import (
	"math"
	"sort"

	"circular-exchange/internal/models"
)

// GamificationService handles points, badges, and leaderboards.
type GamificationService struct {
	db *AppwriteService
}

// NewGamificationService creates a new gamification service.
func NewGamificationService(db *AppwriteService) *GamificationService {
	return &GamificationService{db: db}
}

// GetAllBadges returns all available badges in the system.
func (gs *GamificationService) GetAllBadges() []models.Badge {
	return []models.Badge{
		{ID: "first_exchange", Name: "First Exchange", Description: "Complete your first sustainable exchange", Icon: "🌱", Tier: "bronze", Criteria: "Complete 1 transaction", Threshold: 1},
		{ID: "eco_warrior", Name: "Eco Warrior", Description: "Save 50kg of CO2 through exchanges", Icon: "🛡️", Tier: "bronze", Criteria: "Save 50kg CO2", Threshold: 50},
		{ID: "green_champion", Name: "Green Champion", Description: "Save 200kg of CO2 through exchanges", Icon: "🏆", Tier: "silver", Criteria: "Save 200kg CO2", Threshold: 200},
		{ID: "planet_hero", Name: "Planet Hero", Description: "Save 500kg of CO2 through exchanges", Icon: "🌍", Tier: "gold", Criteria: "Save 500kg CO2", Threshold: 500},
		{ID: "five_trades", Name: "Active Trader", Description: "Complete 5 exchanges", Icon: "🔄", Tier: "bronze", Criteria: "Complete 5 transactions", Threshold: 5},
		{ID: "twenty_trades", Name: "Market Maven", Description: "Complete 20 exchanges", Icon: "📊", Tier: "silver", Criteria: "Complete 20 transactions", Threshold: 20},
		{ID: "recycler_star", Name: "Recycler Star", Description: "List 10 recycled products", Icon: "♻️", Tier: "silver", Criteria: "List 10 products", Threshold: 10},
		{ID: "sustainability_guru", Name: "Sustainability Guru", Description: "Reach sustainability score of 500", Icon: "🧘", Tier: "gold", Criteria: "Score 500+", Threshold: 500},
		{ID: "carbon_neutral", Name: "Carbon Neutral", Description: "Save 1000kg of CO2", Icon: "⚡", Tier: "platinum", Criteria: "Save 1000kg CO2", Threshold: 1000},
		{ID: "top_contributor", Name: "Top Contributor", Description: "Reach #1 on the leaderboard", Icon: "👑", Tier: "platinum", Criteria: "Rank #1 on leaderboard", Threshold: 1},
	}
}

// CalculatePointsForTransaction determines how many points a purchase earns.
func (gs *GamificationService) CalculatePointsForTransaction(carbonSaved float64, price float64) int {
	carbonPoints := int(carbonSaved)
	carbonBonus := 0
	if carbonSaved > 100 {
		carbonBonus = 50
	} else if carbonSaved > 50 {
		carbonBonus = 25
	}
	valueBonus := int(price / 50)
	return carbonPoints + carbonBonus + valueBonus
}

// GetLevel returns the user's level and title based on total points.
func (gs *GamificationService) GetLevel(points int) (int, string) {
	levels := []struct {
		threshold int
		name      string
	}{
		{0, "Eco Seedling"}, {100, "Green Sprout"}, {300, "Sustainability Scout"},
		{600, "Eco Champion"}, {1000, "Green Guardian"}, {2000, "Planet Protector"},
		{5000, "Earth Ambassador"}, {10000, "Sustainability Legend"},
	}

	level := 1
	name := levels[0].name
	for i, l := range levels {
		if points >= l.threshold {
			level = i + 1
			name = l.name
		}
	}
	return level, name
}

// GetNextLevelPoints returns the points needed for the next level.
func (gs *GamificationService) GetNextLevelPoints(currentPoints int) int {
	thresholds := []int{0, 100, 300, 600, 1000, 2000, 5000, 10000}
	for _, t := range thresholds {
		if currentPoints < t {
			return t
		}
	}
	return currentPoints + 5000
}

// GetLeaderboard returns the top users ranked by sustainability score.
func (gs *GamificationService) GetLeaderboard(limit int) []models.LeaderboardEntry {
	users := gs.db.GetAllUsers()

	sort.Slice(users, func(i, j int) bool {
		return users[i].SustainabilityScore > users[j].SustainabilityScore
	})

	if limit <= 0 || limit > len(users) {
		limit = len(users)
	}
	if limit > 50 {
		limit = 50
	}

	entries := make([]models.LeaderboardEntry, 0, limit)
	for i := 0; i < limit && i < len(users); i++ {
		u := users[i]
		txs := gs.db.GetUserTransactions(u.UserID)
		totalCarbon := 0.0
		for _, tx := range txs {
			totalCarbon += tx.CarbonSaved
		}
		entries = append(entries, models.LeaderboardEntry{
			Rank: i + 1, UserID: u.UserID, DisplayName: u.DisplayName,
			AvatarURL: u.AvatarURL, SustainabilityScore: u.SustainabilityScore,
			TotalCarbonSaved: totalCarbon, BadgeCount: len(u.Badges),
		})
	}
	return entries
}

// GetProgress returns a user's full gamification progress.
func (gs *GamificationService) GetProgress(userID string) (*models.GamificationProgress, error) {
	user, err := gs.db.GetUser(userID)
	if err != nil {
		return nil, err
	}

	level, levelName := gs.GetLevel(user.TotalPoints)
	nextLevelPts := gs.GetNextLevelPoints(user.TotalPoints)

	allBadges := gs.GetAllBadges()
	var earned, available []models.Badge

	earnedSet := make(map[string]bool)
	for _, bid := range user.Badges {
		earnedSet[bid] = true
	}
	for _, badge := range allBadges {
		if earnedSet[badge.ID] {
			earned = append(earned, badge)
		} else {
			available = append(available, badge)
		}
	}

	leaderboard := gs.GetLeaderboard(100)
	rank := len(leaderboard)
	for _, entry := range leaderboard {
		if entry.UserID == userID {
			rank = entry.Rank
			break
		}
	}

	return &models.GamificationProgress{
		CurrentPoints: user.TotalPoints, Level: level, LevelName: levelName,
		NextLevelPoints: nextLevelPts, EarnedBadges: earned, AvailableBadges: available, Rank: rank,
	}, nil
}

// CheckAndAwardBadges evaluates and awards any newly earned badges.
func (gs *GamificationService) CheckAndAwardBadges(userID string) []string {
	user, err := gs.db.GetUser(userID)
	if err != nil {
		return nil
	}

	txs := gs.db.GetUserTransactions(userID)
	totalCarbon := 0.0
	for _, tx := range txs {
		totalCarbon += tx.CarbonSaved
	}
	totalTx := len(txs)

	earnedSet := make(map[string]bool)
	for _, bid := range user.Badges {
		earnedSet[bid] = true
	}

	var newBadges []string
	checks := map[string]bool{
		"first_exchange":      totalTx >= 1,
		"five_trades":         totalTx >= 5,
		"twenty_trades":       totalTx >= 20,
		"eco_warrior":         totalCarbon >= 50,
		"green_champion":      totalCarbon >= 200,
		"planet_hero":         totalCarbon >= 500,
		"carbon_neutral":      totalCarbon >= 1000,
		"sustainability_guru": user.SustainabilityScore >= 500,
	}

	for badgeID, earned := range checks {
		if earned && !earnedSet[badgeID] {
			gs.db.AddBadgeToUser(userID, badgeID)
			newBadges = append(newBadges, badgeID)
		}
	}
	return newBadges
}

// CalculateSustainabilityDelta returns the score change for a transaction.
func (gs *GamificationService) CalculateSustainabilityDelta(carbonSaved float64) int {
	return int(math.Ceil(carbonSaved / 5.0))
}
