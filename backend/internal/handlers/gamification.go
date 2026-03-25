package handlers

import (
	"net/http"

	"circular-exchange/internal/middleware"
	"circular-exchange/internal/services"

	"github.com/gin-gonic/gin"
)

// GamificationHandler handles gamification-related HTTP requests.
type GamificationHandler struct {
	gamify *services.GamificationService
}

// NewGamificationHandler creates a new gamification handler.
func NewGamificationHandler(gamify *services.GamificationService) *GamificationHandler {
	return &GamificationHandler{gamify: gamify}
}

// GetBadges handles GET /api/gamification/badges
func (h *GamificationHandler) GetBadges(c *gin.Context) {
	c.JSON(http.StatusOK, h.gamify.GetAllBadges())
}

// GetLeaderboard handles GET /api/gamification/leaderboard
func (h *GamificationHandler) GetLeaderboard(c *gin.Context) {
	c.JSON(http.StatusOK, h.gamify.GetLeaderboard(20))
}

// GetMyProgress handles GET /api/gamification/my-progress
func (h *GamificationHandler) GetMyProgress(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	progress, err := h.gamify.GetProgress(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, progress)
}
