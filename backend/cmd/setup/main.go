// cmd/setup/main.go — Auto-provisions Appwrite database and collections.
// Run this ONCE after creating your Appwrite project:
//   go run cmd/setup/main.go
package main

import (
	"log"

	"circular-exchange/internal/config"

	"github.com/appwrite/sdk-for-go/appwrite"
	"github.com/appwrite/sdk-for-go/databases"
	"github.com/appwrite/sdk-for-go/permission"
	"github.com/appwrite/sdk-for-go/role"
)

func main() {
	cfg := config.LoadConfig()

	if !cfg.IsAppwriteConfigured() {
		log.Fatal("❌ Appwrite not configured. Set APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env")
	}

	client := appwrite.NewClient(
		appwrite.WithEndpoint(cfg.AppwriteEndpoint),
		appwrite.WithProject(cfg.AppwriteProjectID),
		appwrite.WithKey(cfg.AppwriteAPIKey),
	)

	db := appwrite.NewDatabases(client)
	dbID := cfg.AppwriteDatabaseID
	perms := []string{
		permission.Read(role.Any()),
		permission.Write(role.Users("")),
		permission.Create(role.Users("")),
		permission.Update(role.Users("")),
		permission.Delete(role.Users("")),
	}

	// --- Create Database ---
	log.Println("📦 Creating database:", dbID)
	_, err := db.Create(dbID, "Circular Exchange")
	if err != nil {
		log.Println("   Database may already exist:", err)
	} else {
		log.Println("   ✅ Database created")
	}

	// --- Create users_profile Collection ---
	usersColID := cfg.UsersCollectionID
	log.Println("📋 Creating collection:", usersColID)
	_, err = db.CreateCollection(dbID, usersColID, "User Profiles", db.WithCreateCollectionPermissions(perms), db.WithCreateCollectionDocumentSecurity(true))
	if err != nil {
		log.Println("   Collection may already exist:", err)
	} else {
		log.Println("   ✅ Collection created")
	}

	createStringAttr(db, dbID, usersColID, "userId", 255, true)
	createStringAttr(db, dbID, usersColID, "email", 255, true)
	createStringAttr(db, dbID, usersColID, "password", 512, true)
	createStringAttr(db, dbID, usersColID, "displayName", 255, true)
	createStringAttr(db, dbID, usersColID, "role", 50, true)
	createStringAttr(db, dbID, usersColID, "bio", 512, false)
	createStringAttr(db, dbID, usersColID, "avatarUrl", 500, false)
	createIntAttr(db, dbID, usersColID, "sustainabilityScore", false)
	createIntAttr(db, dbID, usersColID, "totalPoints", false)
	createStringAttr(db, dbID, usersColID, "badges", 512, false)

	// --- Create products Collection ---
	prodColID := cfg.ProductsCollectionID
	log.Println("📋 Creating collection:", prodColID)
	_, err = db.CreateCollection(dbID, prodColID, "Products", db.WithCreateCollectionPermissions(perms), db.WithCreateCollectionDocumentSecurity(true))
	if err != nil {
		log.Println("   Collection may already exist:", err)
	} else {
		log.Println("   ✅ Collection created")
	}

	createStringAttr(db, dbID, prodColID, "sellerId", 255, true)
	createStringAttr(db, dbID, prodColID, "sellerName", 255, false)
	createStringAttr(db, dbID, prodColID, "title", 500, true)
	createStringAttr(db, dbID, prodColID, "description", 1024, false)
	createStringAttr(db, dbID, prodColID, "category", 50, true)
	createStringAttr(db, dbID, prodColID, "condition", 50, true)
	createFloatAttr(db, dbID, prodColID, "basePrice", true)
	createFloatAttr(db, dbID, prodColID, "dynamicPrice", false)
	createStringAttr(db, dbID, prodColID, "imageUrls", 512, false)
	createStringAttr(db, dbID, prodColID, "lifecycleData", 512, false)
	createIntAttr(db, dbID, prodColID, "reusePotential", false)
	createStringAttr(db, dbID, prodColID, "status", 50, false)

	// --- Create transactions Collection ---
	txColID := cfg.TransactionsCollectionID
	log.Println("📋 Creating collection:", txColID)
	_, err = db.CreateCollection(dbID, txColID, "Transactions", db.WithCreateCollectionPermissions(perms), db.WithCreateCollectionDocumentSecurity(true))
	if err != nil {
		log.Println("   Collection may already exist:", err)
	} else {
		log.Println("   ✅ Collection created")
	}

	createStringAttr(db, dbID, txColID, "productId", 255, true)
	createStringAttr(db, dbID, txColID, "buyerId", 255, true)
	createStringAttr(db, dbID, txColID, "sellerId", 255, true)
	createFloatAttr(db, dbID, txColID, "finalPrice", true)
	createFloatAttr(db, dbID, txColID, "carbonSaved", false)
	createIntAttr(db, dbID, txColID, "pointsEarned", false)

	log.Println("")
	log.Println("✅ Appwrite setup complete!")
	log.Println("⚠️  Note: Attributes take a few seconds to become available in Appwrite.")
	log.Println("   Wait ~10 seconds, then start the server: go run cmd/server/main.go")
}

func createStringAttr(db *databases.Databases, dbID, colID, key string, size int, required bool) {
	_, err := db.CreateStringAttribute(dbID, colID, key, size, required)
	if err != nil {
		log.Printf("   ⚠️  Attr %s: %v", key, err)
	} else {
		log.Printf("   ✅ Attr: %s (string, size=%d)", key, size)
	}
}

func createIntAttr(db *databases.Databases, dbID, colID, key string, required bool) {
	_, err := db.CreateIntegerAttribute(dbID, colID, key, required)
	if err != nil {
		log.Printf("   ⚠️  Attr %s: %v", key, err)
	} else {
		log.Printf("   ✅ Attr: %s (integer)", key)
	}
}

func createFloatAttr(db *databases.Databases, dbID, colID, key string, required bool) {
	_, err := db.CreateFloatAttribute(dbID, colID, key, required)
	if err != nil {
		log.Printf("   ⚠️  Attr %s: %v", key, err)
	} else {
		log.Printf("   ✅ Attr: %s (float)", key)
	}
}
