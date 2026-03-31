package routes

import (
	"circular-exchange/internal/config"
	"circular-exchange/internal/handlers"
	"circular-exchange/internal/middleware"
	"circular-exchange/internal/services"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes.
func SetupRoutes(router *gin.Engine, cfg *config.Config, db *services.AppwriteService) {
	// Initialize services
	pricingEngine := services.NewPricingEngine(db)
	gamificationService := services.NewGamificationService(db)
	analyticsService := services.NewAnalyticsService(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg.JWTSecret)
	productHandler := handlers.NewProductHandler(db, pricingEngine, gamificationService)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)
	gamificationHandler := handlers.NewGamificationHandler(gamificationService)

	authMW := middleware.AuthMiddleware(cfg.JWTSecret)

	// Recalculate all product prices on startup
	pricingEngine.RecalculateAllPrices()

	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "healthy", "service": "circular-exchange-api", "version": "1.0.0"})
		})

		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/profile", authMW, authHandler.GetProfile)
			auth.PUT("/profile", authMW, authHandler.UpdateProfile)
		}

		// Product routes
		products := api.Group("/products")
		{
			products.GET("", productHandler.ListProducts)
			products.GET("/categories", productHandler.GetCategories)
			products.GET("/my-listings", authMW, productHandler.MyListings)
			products.GET("/:id", productHandler.GetProduct)
			products.POST("", authMW, productHandler.CreateProduct)
			products.PUT("/:id", authMW, productHandler.UpdateProduct)
			products.DELETE("/:id", authMW, productHandler.DeleteProduct)
			products.POST("/:id/purchase", authMW, productHandler.PurchaseProduct)
		}

		// Analytics routes
		analytics := api.Group("/analytics")
		{
			analytics.GET("/global", analyticsHandler.GetGlobalAnalytics)
			analytics.GET("/personal", authMW, analyticsHandler.GetPersonalAnalytics)
		}

		// Gamification routes
		gamification := api.Group("/gamification")
		{
			gamification.GET("/badges", gamificationHandler.GetBadges)
			gamification.GET("/leaderboard", gamificationHandler.GetLeaderboard)
			gamification.GET("/my-progress", authMW, gamificationHandler.GetMyProgress)
		}
	}
}
