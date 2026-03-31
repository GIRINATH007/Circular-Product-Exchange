package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"circular-exchange/internal/models"

	"github.com/gin-gonic/gin"
)

type stubFeedbackStore struct {
	inserted  []models.Feedback
	listed    []models.Feedback
	insertErr error
	listErr   error
}

func (s *stubFeedbackStore) InsertFeedback(_ context.Context, feedback models.Feedback) error {
	if s.insertErr != nil {
		return s.insertErr
	}
	s.inserted = append(s.inserted, feedback)
	return nil
}

func (s *stubFeedbackStore) ListFeedbackByUser(_ context.Context, userID string, _ int64) ([]models.Feedback, error) {
	if s.listErr != nil {
		return nil, s.listErr
	}

	results := make([]models.Feedback, 0, len(s.listed))
	for _, feedback := range s.listed {
		if feedback.UserID == userID {
			results = append(results, feedback)
		}
	}
	return results, nil
}

func TestSubmitFeedbackStoresAuthenticatedContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := &stubFeedbackStore{}
	handler := NewFeedbackHandler(store)

	body, _ := json.Marshal(map[string]string{
		"name":    "Alice",
		"email":   "alice@example.com",
		"message": "Please add feedback history.",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/feedback", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req
	ctx.Set("userID", "user-123")
	ctx.Set("email", "account@example.com")

	handler.SubmitFeedback(ctx)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, rec.Code)
	}
	if len(store.inserted) != 1 {
		t.Fatalf("expected 1 feedback record, got %d", len(store.inserted))
	}
	if store.inserted[0].UserID != "user-123" {
		t.Fatalf("expected user id to be captured, got %q", store.inserted[0].UserID)
	}
	if store.inserted[0].AccountEmail != "account@example.com" {
		t.Fatalf("expected account email to be captured, got %q", store.inserted[0].AccountEmail)
	}
}

func TestSubmitFeedbackRejectsInvalidEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := &stubFeedbackStore{}
	handler := NewFeedbackHandler(store)

	body, _ := json.Marshal(map[string]string{
		"name":    "Alice",
		"email":   "invalid",
		"message": "Hello",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/feedback", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req

	handler.SubmitFeedback(ctx)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
	if len(store.inserted) != 0 {
		t.Fatalf("expected no feedback records to be inserted, got %d", len(store.inserted))
	}
}

func TestGetMyFeedbackReturnsUserScopedEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := &stubFeedbackStore{
		listed: []models.Feedback{
			{UserID: "user-123", Name: "Alice", Email: "alice@example.com", Message: "First"},
			{UserID: "user-456", Name: "Bob", Email: "bob@example.com", Message: "Other"},
			{UserID: "user-123", Name: "Alice", Email: "alice@example.com", Message: "Second"},
		},
	}
	handler := NewFeedbackHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/feedback/mine", nil)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req
	ctx.Set("userID", "user-123")

	handler.GetMyFeedback(ctx)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var response struct {
		Feedback []models.Feedback `json:"feedback"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected valid json response: %v", err)
	}
	if len(response.Feedback) != 2 {
		t.Fatalf("expected 2 feedback entries, got %d", len(response.Feedback))
	}
}

func TestGetMyFeedbackHandlesStoreFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := &stubFeedbackStore{listErr: errors.New("db down")}
	handler := NewFeedbackHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/feedback/mine", nil)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req
	ctx.Set("userID", "user-123")

	handler.GetMyFeedback(ctx)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, rec.Code)
	}
}
