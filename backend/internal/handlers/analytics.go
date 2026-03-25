package handlers

import (
	"net/http"

	"circular-exchange/internal/middleware"
	"circular-exchange/internal/services"

	"github.com/gin-gonic/gin"
)

// AnalyticsHandler handles analytics-related HTTP requests.
type AnalyticsHandler struct {
	analytics *services.AnalyticsService
}

// NewAnalyticsHandler creates a new analytics handler.
func NewAnalyticsHandler(analytics *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analytics: analytics}
}

// GetPersonalAnalytics handles GET /api/analytics/personal
func (h *AnalyticsHandler) GetPersonalAnalytics(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	analytics := h.analytics.GetPersonalAnalytics(userID)
	impactSummary := h.analytics.GetImpactSummary(analytics.TotalCarbonSaved)

	c.JSON(http.StatusOK, gin.H{"analytics": analytics, "impactSummary": impactSummary})
}

// GetGlobalAnalytics handles GET /api/analytics/global
func (h *AnalyticsHandler) GetGlobalAnalytics(c *gin.Context) {
	analytics := h.analytics.GetGlobalAnalytics()
	impactSummary := h.analytics.GetImpactSummary(analytics.TotalCarbonSaved)

	c.JSON(http.StatusOK, gin.H{"analytics": analytics, "impactSummary": impactSummary})
}
