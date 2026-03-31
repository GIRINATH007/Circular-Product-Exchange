package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"circular-exchange/internal/middleware"
	"circular-exchange/internal/models"
	"circular-exchange/internal/services"

	"github.com/gin-gonic/gin"
)

// FeedbackHandler handles feedback-related API requests.
type FeedbackHandler struct {
	store services.FeedbackStore
}

// NewFeedbackHandler creates a new FeedbackHandler.
func NewFeedbackHandler(store services.FeedbackStore) *FeedbackHandler {
	return &FeedbackHandler{
		store: store,
	}
}

// SubmitFeedback handles POST /api/feedback
func (h *FeedbackHandler) SubmitFeedback(c *gin.Context) {
	var input struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Message string `json:"message"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(input.Email)
	input.Message = strings.TrimSpace(input.Message)

	if input.Name == "" || input.Email == "" || input.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name, email, and message are required"})
		return
	}

	if !strings.Contains(input.Email, "@") || !strings.Contains(input.Email, ".") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid email address"})
		return
	}

	feedback := models.Feedback{
		Name:      input.Name,
		Email:     input.Email,
		Message:   input.Message,
		CreatedAt: time.Now(),
	}

	if userID, exists := middleware.GetUserIDFromContext(c); exists {
		feedback.UserID = userID
	}
	if accountEmail, exists := middleware.GetEmailFromContext(c); exists {
		feedback.AccountEmail = accountEmail
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.store.InsertFeedback(ctx, feedback); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit feedback"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Thank you for your feedback!"})
}

// GetMyFeedback handles GET /api/feedback/mine
func (h *FeedbackHandler) GetMyFeedback(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	feedback, err := h.store.ListFeedbackByUser(ctx, userID, 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load feedback history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"feedback": feedback})
}
