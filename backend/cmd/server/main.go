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

	log.Println("🌿 Circular Exchange Platform — Starting up...")
	log.Printf("📍 Port: %s", cfg.Port)

	db := services.NewAppwriteService(cfg)
	log.Println("✅ Database service initialized (in-memory mode with demo data)")

	router := gin.Default()
	router.Use(middleware.SetupCORS())
	log.Println("✅ CORS middleware configured")

	routes.SetupRoutes(router, cfg, db)
	log.Println("✅ API routes registered")

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Server starting on http://localhost%s", addr)
	log.Println("📖 API docs: http://localhost" + addr + "/api/health")
	log.Println("")
	log.Println("Demo accounts:")
	log.Println("  📧 alice@example.com / password123 (seller)")
	log.Println("  📧 bob@example.com / password123 (buyer)")
	log.Println("  📧 carol@example.com / password123 (recycler)")

	if err := router.Run(addr); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
