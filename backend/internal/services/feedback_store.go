package services

import (
	"context"

	"circular-exchange/internal/models"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// FeedbackStore abstracts feedback persistence for handlers and tests.
type FeedbackStore interface {
	InsertFeedback(ctx context.Context, feedback models.Feedback) error
	ListFeedbackByUser(ctx context.Context, userID string, limit int64) ([]models.Feedback, error)
}

// MongoFeedbackStore persists feedback entries in MongoDB.
type MongoFeedbackStore struct {
	collection *mongo.Collection
}

// NewMongoFeedbackStore creates a new MongoDB-backed feedback store.
func NewMongoFeedbackStore(db *mongo.Database) *MongoFeedbackStore {
	return &MongoFeedbackStore{collection: db.Collection("feedback")}
}

// InsertFeedback stores a new feedback entry.
func (s *MongoFeedbackStore) InsertFeedback(ctx context.Context, feedback models.Feedback) error {
	_, err := s.collection.InsertOne(ctx, feedback)
	return err
}

// ListFeedbackByUser returns feedback submitted by a specific authenticated user.
func (s *MongoFeedbackStore) ListFeedbackByUser(ctx context.Context, userID string, limit int64) ([]models.Feedback, error) {
	if limit <= 0 {
		limit = 20
	}

	cursor, err := s.collection.Find(
		ctx,
		bson.M{"user_id": userID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(limit),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var feedback []models.Feedback
	if err := cursor.All(ctx, &feedback); err != nil {
		return nil, err
	}

	return feedback, nil
}
