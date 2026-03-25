package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application.
type Config struct {
	AppwriteEndpoint   string
	AppwriteProjectID  string
	AppwriteAPIKey     string
	AppwriteDatabaseID string

	// Collection IDs
	UsersCollectionID        string
	ProductsCollectionID     string
	TransactionsCollectionID string

	JWTSecret string
	Port      string
}

// IsAppwriteConfigured returns true if Appwrite credentials are set.
func (c *Config) IsAppwriteConfigured() bool {
	return c.AppwriteProjectID != "" && c.AppwriteAPIKey != ""
}

// LoadConfig reads the .env file and returns a Config struct.
func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  No .env file found — using system environment variables")
	}

	cfg := &Config{
		AppwriteEndpoint:         getEnv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1"),
		AppwriteProjectID:        getEnv("APPWRITE_PROJECT_ID", ""),
		AppwriteAPIKey:           getEnv("APPWRITE_API_KEY", ""),
		AppwriteDatabaseID:       getEnv("APPWRITE_DATABASE_ID", "circular_exchange_db"),
		UsersCollectionID:        getEnv("APPWRITE_USERS_COLLECTION_ID", "users_profile"),
		ProductsCollectionID:     getEnv("APPWRITE_PRODUCTS_COLLECTION_ID", "products"),
		TransactionsCollectionID: getEnv("APPWRITE_TRANSACTIONS_COLLECTION_ID", "transactions"),
		JWTSecret:                getEnv("JWT_SECRET", "default-secret-change-me"),
		Port:                     getEnv("PORT", "8080"),
	}

	if !cfg.IsAppwriteConfigured() {
		log.Println("⚠️  Appwrite not configured — using in-memory storage")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
