package models

import "time"

// User represents a user profile stored in the database.
type User struct {
	ID                  string    `json:"id"`
	UserID              string    `json:"userId"`
	Email               string    `json:"email"`
	DisplayName         string    `json:"displayName"`
	Role                string    `json:"role"` // "buyer", "seller"
	Bio                 string    `json:"bio"`
	AvatarURL           string    `json:"avatarUrl"`
	SustainabilityScore int       `json:"sustainabilityScore"`
	TotalPoints         int       `json:"totalPoints"`
	Badges              []string  `json:"badges"`
	JoinedAt            time.Time `json:"joinedAt"`
}

// RegisterRequest is sent by the client when creating an account.
type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"displayName" binding:"required,min=2"`
	Role        string `json:"role" binding:"required,oneof=buyer seller"`
}

// LoginRequest is sent by the client when logging in.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse is returned after successful login.
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// UpdateProfileRequest allows users to update their profile.
type UpdateProfileRequest struct {
	DisplayName string `json:"displayName"`
	Bio         string `json:"bio"`
	AvatarURL   string `json:"avatarUrl"`
}
