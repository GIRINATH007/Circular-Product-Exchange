package main

import (
	"fmt"
	"log"

	"circular-exchange/internal/config"
	"circular-exchange/internal/middleware"
	"circular-exchange/internal/routes"
	"circular-exchange/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	log.Println("Circular Exchange Platform starting up...")
	log.Printf("Port: %s", cfg.Port)

	db := services.NewAppwriteService(cfg)
	log.Println("Database service initialized")

	// Connect to MongoDB for feedback feature
	mongoClient, err := services.ConnectMongo(cfg.MongoURI)
	if err != nil {
		log.Printf("MongoDB unavailable for feedback service: %v", err)
		log.Println("Continuing startup with Appwrite-backed core APIs")
	} else {
		log.Println("MongoDB connected for feedback service")
	}

	router := gin.Default()
	router.Use(middleware.SetupCORS())
	log.Println("CORS middleware configured")

	routes.SetupRoutes(router, cfg, db, mongoClient)
	log.Println("API routes registered")

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on http://localhost%s", addr)
	log.Println("API docs: http://localhost" + addr + "/api/health")
	log.Println("")
	log.Println("Demo accounts:")
	log.Println("  alice@example.com / password123 (seller)")
	log.Println("  bob@example.com / password123 (buyer)")
	log.Println("  carol@example.com / password123 (seller)")

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
