package models

import "time"

// Feedback represents a user-submitted feedback entry stored in MongoDB.
type Feedback struct {
	ID           string    `json:"id,omitempty" bson:"_id,omitempty"`
	UserID       string    `json:"userId,omitempty" bson:"user_id,omitempty"`
	AccountEmail string    `json:"accountEmail,omitempty" bson:"account_email,omitempty"`
	Name         string    `json:"name" bson:"name"`
	Email        string    `json:"email" bson:"email"`
	Message      string    `json:"message" bson:"message"`
	CreatedAt    time.Time `json:"createdAt" bson:"created_at"`
}
