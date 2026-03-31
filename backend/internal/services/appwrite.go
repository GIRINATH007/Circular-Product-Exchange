package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"circular-exchange/internal/config"
	"circular-exchange/internal/models"

	"github.com/appwrite/sdk-for-go/appwrite"
	"github.com/appwrite/sdk-for-go/databases"
	"github.com/appwrite/sdk-for-go/id"
	awModels "github.com/appwrite/sdk-for-go/models"
	"github.com/appwrite/sdk-for-go/query"
	"github.com/google/uuid"
)

// AppwriteService wraps all database operations.
// Supports both Appwrite (persistent) and in-memory (dev) backends.
type AppwriteService struct {
	cfg      *config.Config
	db       *databases.Databases
	useCloud bool

	// In-memory fallback
	mu           sync.RWMutex
	users        map[string]*models.User
	products     map[string]*models.Product
	transactions map[string]*models.Transaction
	passwords    map[string]string
	emailToID    map[string]string
}

func NewAppwriteService(cfg *config.Config) *AppwriteService {
	svc := &AppwriteService{
		cfg:          cfg,
		users:        make(map[string]*models.User),
		products:     make(map[string]*models.Product),
		transactions: make(map[string]*models.Transaction),
		passwords:    make(map[string]string),
		emailToID:    make(map[string]string),
	}

	if cfg.IsAppwriteConfigured() {
		client := appwrite.NewClient(
			appwrite.WithEndpoint(cfg.AppwriteEndpoint),
			appwrite.WithProject(cfg.AppwriteProjectID),
			appwrite.WithKey(cfg.AppwriteAPIKey),
		)
		svc.db = appwrite.NewDatabases(client)
		svc.useCloud = true
		log.Println("☁️  Using Appwrite Cloud for persistent storage")
	} else {
		log.Println("💾 Using in-memory storage (data resets on restart)")
		svc.seedDemoData()
	}

	return svc
}

// rawDocList is a helper struct to decode a DocumentList response into typed Go values.
type rawDocList struct {
	Total     int                      `json:"total"`
	Documents []map[string]interface{} `json:"documents"`
}

// decodeDocList extracts all document data from a DocumentList response.
// Individual Document items in a list don't carry raw bytes, so we must
// Decode() the parent DocumentList instead.
func decodeDocList(docs *awModels.DocumentList) []map[string]interface{} {
	var raw rawDocList
	err := docs.Decode(&raw)
	if err != nil || raw.Documents == nil {
		return nil
	}
	return raw.Documents
}

// decodeSingleDoc extracts data from a single Document returned by GetDocument.
func decodeSingleDoc(doc *awModels.Document) map[string]interface{} {
	var data map[string]interface{}
	doc.Decode(&data)
	return data
}

// ─── User Operations ─────────────────────────────────────────────────────────

func (s *AppwriteService) CreateUser(email, password, displayName, role string) (*models.User, error) {
	userID := uuid.New().String()
	hashedPw := simpleHash(password)

	user := &models.User{
		ID: userID, UserID: userID, Email: email,
		DisplayName: displayName, Role: role,
		SustainabilityScore: 0, TotalPoints: 0,
		Badges: []string{}, JoinedAt: time.Now(),
	}

	if s.useCloud {
		badgesJSON, _ := json.Marshal(user.Badges)
		data := map[string]interface{}{
			"userId": userID, "email": email, "password": hashedPw,
			"displayName": displayName, "role": role,
			"bio": "", "avatarUrl": "",
			"sustainabilityScore": 0, "totalPoints": 0,
			"badges": string(badgesJSON),
		}
		doc, err := s.db.CreateDocument(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID, id.Unique(), data)
		if err != nil {
			return nil, fmt.Errorf("failed to create user: %v", err)
		}
		user.ID = doc.Id
		return user, nil
	}

	// In-memory
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.emailToID[email]; exists {
		return nil, fmt.Errorf("email already registered")
	}
	s.passwords[email] = hashedPw
	s.emailToID[email] = userID
	s.users[userID] = user
	return user, nil
}

func (s *AppwriteService) ValidateLogin(email, password string) (*models.User, error) {
	hashedPw := simpleHash(password)

	if s.useCloud {
		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID,
			s.db.WithListDocumentsQueries([]string{
				query.Equal("email", email),
				query.Limit(1),
			}),
		)
		if err != nil || docs.Total == 0 {
			return nil, fmt.Errorf("invalid email or password")
		}
		allData := decodeDocList(docs)
		if len(allData) == 0 {
			return nil, fmt.Errorf("invalid email or password")
		}
		data := allData[0]
		if getString(data, "password") != hashedPw {
			return nil, fmt.Errorf("invalid email or password")
		}
		return docToUser(docs.Documents[0].Id, data), nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	storedPw, exists := s.passwords[email]
	if !exists || storedPw != hashedPw {
		return nil, fmt.Errorf("invalid email or password")
	}
	userID := s.emailToID[email]
	user, exists := s.users[userID]
	if !exists {
		return nil, fmt.Errorf("user profile not found")
	}
	return user, nil
}

func (s *AppwriteService) GetUser(userID string) (*models.User, error) {
	if s.useCloud {
		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID,
			s.db.WithListDocumentsQueries([]string{
				query.Equal("userId", userID),
				query.Limit(1),
			}),
		)
		if err != nil || docs.Total == 0 {
			return nil, fmt.Errorf("user not found")
		}
		allData := decodeDocList(docs)
		if len(allData) == 0 {
			return nil, fmt.Errorf("user not found")
		}
		return docToUser(docs.Documents[0].Id, allData[0]), nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	user, exists := s.users[userID]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

func (s *AppwriteService) UpdateUser(userID string, updates models.UpdateProfileRequest) (*models.User, error) {
	if s.useCloud {
		docID, err := s.getUserDocID(userID)
		if err != nil {
			return nil, err
		}
		data := map[string]interface{}{}
		if updates.DisplayName != "" {
			data["displayName"] = updates.DisplayName
		}
		if updates.Bio != "" {
			data["bio"] = updates.Bio
		}
		if updates.AvatarURL != "" {
			data["avatarUrl"] = updates.AvatarURL
		}
		if len(data) > 0 {
			_, err = s.db.UpdateDocument(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID, docID,
				s.db.WithUpdateDocumentData(data))
			if err != nil {
				return nil, fmt.Errorf("failed to update user: %v", err)
			}
		}
		return s.GetUser(userID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	user, exists := s.users[userID]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}
	if updates.DisplayName != "" {
		user.DisplayName = updates.DisplayName
	}
	if updates.Bio != "" {
		user.Bio = updates.Bio
	}
	if updates.AvatarURL != "" {
		user.AvatarURL = updates.AvatarURL
	}
	return user, nil
}

func (s *AppwriteService) UpdateUserScore(userID string, points int, sustainabilityDelta int) error {
	if s.useCloud {
		user, err := s.GetUser(userID)
		if err != nil {
			return err
		}
		docID, err := s.getUserDocID(userID)
		if err != nil {
			return err
		}
		_, err = s.db.UpdateDocument(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID, docID,
			s.db.WithUpdateDocumentData(map[string]interface{}{
				"totalPoints":         user.TotalPoints + points,
				"sustainabilityScore": user.SustainabilityScore + sustainabilityDelta,
			}))
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	user, exists := s.users[userID]
	if !exists {
		return fmt.Errorf("user not found")
	}
	user.TotalPoints += points
	user.SustainabilityScore += sustainabilityDelta
	return nil
}

func (s *AppwriteService) AddBadgeToUser(userID string, badgeID string) error {
	if s.useCloud {
		user, err := s.GetUser(userID)
		if err != nil {
			return err
		}
		for _, b := range user.Badges {
			if b == badgeID {
				return nil
			}
		}
		user.Badges = append(user.Badges, badgeID)
		badgesJSON, _ := json.Marshal(user.Badges)
		docID, _ := s.getUserDocID(userID)
		_, err = s.db.UpdateDocument(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID, docID,
			s.db.WithUpdateDocumentData(map[string]interface{}{
				"badges": string(badgesJSON),
			}))
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	user, exists := s.users[userID]
	if !exists {
		return fmt.Errorf("user not found")
	}
	for _, b := range user.Badges {
		if b == badgeID {
			return nil
		}
	}
	user.Badges = append(user.Badges, badgeID)
	return nil
}

func (s *AppwriteService) GetAllUsers() []*models.User {
	if s.useCloud {
		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID,
			s.db.WithListDocumentsQueries([]string{query.Limit(100)}),
		)
		if err != nil {
			return nil
		}
		allData := decodeDocList(docs)
		users := make([]*models.User, 0, len(allData))
		for i, data := range allData {
			users = append(users, docToUser(docs.Documents[i].Id, data))
		}
		return users
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	users := make([]*models.User, 0, len(s.users))
	for _, u := range s.users {
		users = append(users, u)
	}
	return users
}

// ─── Product Operations ──────────────────────────────────────────────────────

// GetUserProducts returns all products owned by a specific user.
// If includeArchived is true, also returns products with status "archived".
func (s *AppwriteService) GetUserProducts(userID string, includeArchived bool) []*models.Product {
	if s.useCloud {
		queries := []string{
			query.Equal("sellerId", userID),
			query.Limit(200),
		}
		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID,
			s.db.WithListDocumentsQueries(queries),
		)
		if err != nil {
			return []*models.Product{}
		}
		allData := decodeDocList(docs)
		products := make([]*models.Product, 0, len(allData))
		for i, data := range allData {
			p := docToProduct(docs.Documents[i].Id, data, docs.Documents[i].CreatedAt)
			if !includeArchived && p.Status == "archived" {
				continue
			}
			products = append(products, p)
		}
		return products
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	var results []*models.Product
	for _, p := range s.products {
		if p.SellerID != userID {
			continue
		}
		if !includeArchived && p.Status == "archived" {
			continue
		}
		results = append(results, p)
	}
	return results
}

func (s *AppwriteService) CreateProduct(product *models.Product) (*models.Product, error) {
	product.ID = uuid.New().String()
	product.Status = "active"
	product.CreatedAt = time.Now()

	if s.useCloud {
		lcJSON, _ := json.Marshal(product.LifecycleData)
		imgURLs := product.ImageURLs
		if imgURLs == nil {
			imgURLs = []string{}
		}
		imgJSON, _ := json.Marshal(imgURLs)
		data := map[string]interface{}{
			"sellerId": product.SellerID, "sellerName": product.SellerName,
			"title": product.Title, "description": product.Description,
			"category": product.Category, "condition": product.Condition,
			"basePrice": product.BasePrice, "dynamicPrice": product.DynamicPrice,
			"imageUrls": string(imgJSON), "lifecycleData": string(lcJSON),
			"reusePotential": product.ReusePotential, "status": product.Status,
		}
		doc, err := s.db.CreateDocument(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID, id.Unique(), data)
		if err != nil {
			return nil, fmt.Errorf("failed to create product: %v", err)
		}
		product.ID = doc.Id
		return product, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.products[product.ID] = product
	return product, nil
}

func (s *AppwriteService) GetProduct(productID string) (*models.Product, error) {
	if s.useCloud {
		doc, err := s.db.GetDocument(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID, productID)
		if err != nil {
			return nil, fmt.Errorf("product not found")
		}
		return docToProduct(doc.Id, decodeSingleDoc(doc), doc.CreatedAt), nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	product, exists := s.products[productID]
	if !exists {
		return nil, fmt.Errorf("product not found")
	}
	return product, nil
}

func (s *AppwriteService) ListProducts(filter models.ProductFilter) ([]*models.Product, int) {
	if s.useCloud {
		queries := []string{query.Equal("status", "active")}
		if filter.Category != "" {
			queries = append(queries, query.Equal("category", filter.Category))
		}
		if filter.Condition != "" {
			queries = append(queries, query.Equal("condition", filter.Condition))
		}
		queries = append(queries, query.Limit(200))

		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID,
			s.db.WithListDocumentsQueries(queries),
		)
		if err != nil {
			return []*models.Product{}, 0
		}
		allData := decodeDocList(docs)
		products := make([]*models.Product, 0, len(allData))
		for i, data := range allData {
			products = append(products, docToProduct(docs.Documents[i].Id, data, docs.Documents[i].CreatedAt))
		}
		filtered := filterProducts(products, filter)
		total := len(filtered)
		return paginateProducts(filtered, filter), total
	}

	// In-memory
	s.mu.RLock()
	defer s.mu.RUnlock()
	var results []*models.Product
	for _, p := range s.products {
		if p.Status != "active" {
			continue
		}
		results = append(results, p)
	}
	filtered := filterProducts(results, filter)
	total := len(filtered)
	return paginateProducts(filtered, filter), total
}

func (s *AppwriteService) UpdateProduct(productID string, updates models.UpdateProductRequest) (*models.Product, error) {
	if s.useCloud {
		data := map[string]interface{}{}
		if updates.Title != "" {
			data["title"] = updates.Title
		}
		if updates.Description != "" {
			data["description"] = updates.Description
		}
		if updates.BasePrice > 0 {
			data["basePrice"] = updates.BasePrice
		}
		if updates.ImageURLs != nil {
			imgJSON, _ := json.Marshal(updates.ImageURLs)
			data["imageUrls"] = string(imgJSON)
		}
		if updates.LifecycleData != nil {
			lcJSON, _ := json.Marshal(updates.LifecycleData)
			data["lifecycleData"] = string(lcJSON)
		}
		if updates.Status != "" {
			data["status"] = updates.Status
		}
		if len(data) > 0 {
			_, err := s.db.UpdateDocument(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID, productID,
				s.db.WithUpdateDocumentData(data))
			if err != nil {
				return nil, fmt.Errorf("failed to update product: %v", err)
			}
		}
		return s.GetProduct(productID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	product, exists := s.products[productID]
	if !exists {
		return nil, fmt.Errorf("product not found")
	}
	if updates.Title != "" {
		product.Title = updates.Title
	}
	if updates.Description != "" {
		product.Description = updates.Description
	}
	if updates.BasePrice > 0 {
		product.BasePrice = updates.BasePrice
	}
	if updates.ImageURLs != nil {
		product.ImageURLs = updates.ImageURLs
	}
	if updates.LifecycleData != nil {
		product.LifecycleData = *updates.LifecycleData
	}
	if updates.Status != "" {
		product.Status = updates.Status
	}
	return product, nil
}

func (s *AppwriteService) DeleteProduct(productID string) error {
	if s.useCloud {
		_, err := s.db.UpdateDocument(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID, productID,
			s.db.WithUpdateDocumentData(map[string]interface{}{"status": "archived"}))
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	product, exists := s.products[productID]
	if !exists {
		return fmt.Errorf("product not found")
	}
	product.Status = "archived"
	return nil
}

func (s *AppwriteService) GetProductsByCategory() map[string]int {
	if s.useCloud {
		counts := make(map[string]int)
		categories := []string{"electronics", "furniture", "clothing", "appliances", "books", "sports", "toys", "automotive", "other"}
		for _, cat := range categories {
			docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID,
				s.db.WithListDocumentsQueries([]string{
					query.Equal("status", "active"),
					query.Equal("category", cat),
					query.Limit(1),
				}),
			)
			if err == nil {
				counts[cat] = docs.Total
			}
		}
		return counts
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	counts := make(map[string]int)
	for _, p := range s.products {
		if p.Status == "active" {
			counts[p.Category]++
		}
	}
	return counts
}

func (s *AppwriteService) GetProductCountByCategory(category string) int {
	if s.useCloud {
		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.ProductsCollectionID,
			s.db.WithListDocumentsQueries([]string{
				query.Equal("status", "active"),
				query.Equal("category", category),
				query.Limit(1),
			}),
		)
		if err != nil {
			return 0
		}
		return docs.Total
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, p := range s.products {
		if p.Status == "active" && p.Category == category {
			count++
		}
	}
	return count
}

// ─── Transaction Operations ──────────────────────────────────────────────────

func (s *AppwriteService) CreateTransaction(tx *models.Transaction) (*models.Transaction, error) {
	tx.ID = uuid.New().String()
	tx.CreatedAt = time.Now()

	if s.useCloud {
		data := map[string]interface{}{
			"productId": tx.ProductID, "buyerId": tx.BuyerID, "sellerId": tx.SellerID,
			"finalPrice": tx.FinalPrice, "carbonSaved": tx.CarbonSaved,
			"pointsEarned": tx.PointsEarned,
		}
		doc, err := s.db.CreateDocument(s.cfg.AppwriteDatabaseID, s.cfg.TransactionsCollectionID, id.Unique(), data)
		if err != nil {
			return nil, fmt.Errorf("failed to create transaction: %v", err)
		}
		tx.ID = doc.Id
		return tx, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.transactions[tx.ID] = tx
	return tx, nil
}

func (s *AppwriteService) GetUserTransactions(userID string) []*models.Transaction {
	if s.useCloud {
		results := []*models.Transaction{}
		buyerDocs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.TransactionsCollectionID,
			s.db.WithListDocumentsQueries([]string{query.Equal("buyerId", userID), query.Limit(100)}),
		)
		if err == nil {
			buyerData := decodeDocList(buyerDocs)
			for i, data := range buyerData {
				results = append(results, docToTransaction(buyerDocs.Documents[i].Id, data, buyerDocs.Documents[i].CreatedAt))
			}
		}
		sellerDocs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.TransactionsCollectionID,
			s.db.WithListDocumentsQueries([]string{query.Equal("sellerId", userID), query.Limit(100)}),
		)
		if err == nil {
			seen := make(map[string]bool)
			for _, r := range results {
				seen[r.ID] = true
			}
			sellerData := decodeDocList(sellerDocs)
			for i, data := range sellerData {
				if !seen[sellerDocs.Documents[i].Id] {
					results = append(results, docToTransaction(sellerDocs.Documents[i].Id, data, sellerDocs.Documents[i].CreatedAt))
				}
			}
		}
		return results
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	var results []*models.Transaction
	for _, tx := range s.transactions {
		if tx.BuyerID == userID || tx.SellerID == userID {
			results = append(results, tx)
		}
	}
	return results
}

func (s *AppwriteService) GetAllTransactions() []*models.Transaction {
	if s.useCloud {
		docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.TransactionsCollectionID,
			s.db.WithListDocumentsQueries([]string{query.Limit(500)}),
		)
		if err != nil {
			return nil
		}
		allData := decodeDocList(docs)
		results := make([]*models.Transaction, 0, len(allData))
		for i, data := range allData {
			results = append(results, docToTransaction(docs.Documents[i].Id, data, docs.Documents[i].CreatedAt))
		}
		return results
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	results := make([]*models.Transaction, 0, len(s.transactions))
	for _, tx := range s.transactions {
		results = append(results, tx)
	}
	return results
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

func (s *AppwriteService) getUserDocID(userID string) (string, error) {
	docs, err := s.db.ListDocuments(s.cfg.AppwriteDatabaseID, s.cfg.UsersCollectionID,
		s.db.WithListDocumentsQueries([]string{query.Equal("userId", userID), query.Limit(1)}),
	)
	if err != nil || docs.Total == 0 {
		return "", fmt.Errorf("user document not found")
	}
	return docs.Documents[0].Id, nil
}

func docToUser(docID string, data map[string]interface{}) *models.User {
	badges := []string{}
	if badgesStr := getString(data, "badges"); badgesStr != "" {
		json.Unmarshal([]byte(badgesStr), &badges)
	}
	return &models.User{
		ID: docID, UserID: getString(data, "userId"),
		Email: getString(data, "email"), DisplayName: getString(data, "displayName"),
		Role: getString(data, "role"), Bio: getString(data, "bio"),
		AvatarURL:           getString(data, "avatarUrl"),
		SustainabilityScore: getInt(data, "sustainabilityScore"),
		TotalPoints:         getInt(data, "totalPoints"),
		Badges:              badges,
	}
}

func docToProduct(docID string, data map[string]interface{}, createdAt string) *models.Product {
	var lifecycle models.LifecycleData
	if lcStr := getString(data, "lifecycleData"); lcStr != "" {
		json.Unmarshal([]byte(lcStr), &lifecycle)
	}
	var imageURLs []string
	if imgStr := getString(data, "imageUrls"); imgStr != "" {
		json.Unmarshal([]byte(imgStr), &imageURLs)
	}
	parsedTime, _ := time.Parse(time.RFC3339, createdAt)
	return &models.Product{
		ID: docID, SellerID: getString(data, "sellerId"), SellerName: getString(data, "sellerName"),
		Title: getString(data, "title"), Description: getString(data, "description"),
		Category: getString(data, "category"), Condition: getString(data, "condition"),
		BasePrice: getFloat(data, "basePrice"), DynamicPrice: getFloat(data, "dynamicPrice"),
		ImageURLs: imageURLs, LifecycleData: lifecycle,
		ReusePotential: getInt(data, "reusePotential"),
		Status:         getString(data, "status"),
		CreatedAt:      parsedTime,
	}
}

func docToTransaction(docID string, data map[string]interface{}, createdAt string) *models.Transaction {
	parsedTime, _ := time.Parse(time.RFC3339, createdAt)
	return &models.Transaction{
		ID: docID, ProductID: getString(data, "productId"),
		BuyerID: getString(data, "buyerId"), SellerID: getString(data, "sellerId"),
		FinalPrice: getFloat(data, "finalPrice"), CarbonSaved: getFloat(data, "carbonSaved"),
		PointsEarned: getInt(data, "pointsEarned"), CreatedAt: parsedTime,
	}
}

func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok {
		if s, ok := val.(string); ok {
			return s
		}
	}
	return ""
}

func getInt(data map[string]interface{}, key string) int {
	if val, ok := data[key]; ok {
		switch v := val.(type) {
		case float64:
			return int(v)
		case int:
			return v
		}
	}
	return 0
}

func getFloat(data map[string]interface{}, key string) float64 {
	if val, ok := data[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		}
	}
	return 0
}

func simpleHash(password string) string {
	return fmt.Sprintf("%x", []byte(password))
}

func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

func filterProducts(products []*models.Product, filter models.ProductFilter) []*models.Product {
	results := make([]*models.Product, 0, len(products))
	for _, p := range products {
		if filter.Category != "" && p.Category != filter.Category {
			continue
		}
		if filter.Condition != "" && p.Condition != filter.Condition {
			continue
		}
		price := p.DynamicPrice
		if price <= 0 {
			price = p.BasePrice
		}
		if filter.MinPrice > 0 && price < filter.MinPrice {
			continue
		}
		if filter.MaxPrice > 0 && price > filter.MaxPrice {
			continue
		}
		if filter.SearchQuery != "" && !containsIgnoreCase(p.Title, filter.SearchQuery) && !containsIgnoreCase(p.Description, filter.SearchQuery) {
			continue
		}
		results = append(results, p)
	}

	sort.Slice(results, func(i, j int) bool {
		leftPrice := results[i].DynamicPrice
		if leftPrice <= 0 {
			leftPrice = results[i].BasePrice
		}
		rightPrice := results[j].DynamicPrice
		if rightPrice <= 0 {
			rightPrice = results[j].BasePrice
		}

		switch filter.SortBy {
		case "price_asc":
			return leftPrice < rightPrice
		case "price_desc":
			return leftPrice > rightPrice
		case "sustainability":
			return results[i].ReusePotential > results[j].ReusePotential
		default:
			return results[i].CreatedAt.After(results[j].CreatedAt)
		}
	})

	return results
}

func paginateProducts(products []*models.Product, filter models.ProductFilter) []*models.Product {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 50 {
		limit = 12
	}
	start := (page - 1) * limit
	if start >= len(products) {
		return []*models.Product{}
	}
	end := start + limit
	if end > len(products) {
		end = len(products)
	}
	return products[start:end]
}

// ─── Demo Data Seeding (in-memory only) ──────────────────────────────────────

func (s *AppwriteService) seedDemoData() {
	demoUsers := []struct{ email, password, name, role string }{
		{"alice@example.com", "password123", "Alice Green", "seller"},
		{"bob@example.com", "password123", "Bob Reuser", "buyer"},
		{"carol@example.com", "password123", "Carol Recycle", "seller"},
		{"dave@example.com", "password123", "Dave Sustain", "seller"},
		{"emma@example.com", "password123", "Emma Eco", "buyer"},
	}
	for _, u := range demoUsers {
		user, _ := s.CreateUser(u.email, u.password, u.name, u.role)
		if user != nil {
			user.SustainabilityScore = 50 + len(u.name)*7%100
			user.TotalPoints = 100 + len(u.name)*13%500
			user.Badges = []string{"first_exchange", "eco_warrior"}
		}
	}

	demoProducts := []models.Product{
		{SellerID: s.getUserIDByEmail("alice@example.com"), SellerName: "Alice Green", Title: "Refurbished MacBook Pro 2023", Description: "Excellent condition MacBook Pro with M2 chip. Battery health at 92%.", Category: "electronics", Condition: "like_new", BasePrice: 899.99, LifecycleData: models.LifecycleData{ManufacturingImpact: 394, UsageMonths: 18, RefurbishmentQuality: 92, ExpectedReuseCycles: 3, MaterialRecyclability: 78, CarbonSaved: 285}, ReusePotential: 88},
		{SellerID: s.getUserIDByEmail("dave@example.com"), SellerName: "Dave Sustain", Title: "Restored Mid-Century Modern Chair", Description: "Beautiful walnut dining chair. Professionally reupholstered.", Category: "furniture", Condition: "good", BasePrice: 225, LifecycleData: models.LifecycleData{ManufacturingImpact: 47, UsageMonths: 360, RefurbishmentQuality: 85, ExpectedReuseCycles: 5, MaterialRecyclability: 90, CarbonSaved: 38}, ReusePotential: 92},
		{SellerID: s.getUserIDByEmail("carol@example.com"), SellerName: "Carol Recycle", Title: "Upcycled Denim Jacket", Description: "Handcrafted from 3 pairs of recycled jeans. Size M.", Category: "clothing", Condition: "like_new", BasePrice: 85, LifecycleData: models.LifecycleData{ManufacturingImpact: 8, UsageMonths: 0, RefurbishmentQuality: 95, ExpectedReuseCycles: 4, MaterialRecyclability: 85, CarbonSaved: 25}, ReusePotential: 90},
		{SellerID: s.getUserIDByEmail("alice@example.com"), SellerName: "Alice Green", Title: "Samsung Galaxy S24 Ultra — Refurbished", Description: "Grade A refurbished. New battery. Unlocked 256GB.", Category: "electronics", Condition: "good", BasePrice: 649.99, LifecycleData: models.LifecycleData{ManufacturingImpact: 70, UsageMonths: 14, RefurbishmentQuality: 88, ExpectedReuseCycles: 2, MaterialRecyclability: 65, CarbonSaved: 52}, ReusePotential: 80},
		{SellerID: s.getUserIDByEmail("dave@example.com"), SellerName: "Dave Sustain", Title: "Reconditioned Dyson V15 Vacuum", Description: "Factory reconditioned. New filter and brush bar.", Category: "appliances", Condition: "good", BasePrice: 379.99, LifecycleData: models.LifecycleData{ManufacturingImpact: 35, UsageMonths: 24, RefurbishmentQuality: 90, ExpectedReuseCycles: 3, MaterialRecyclability: 72, CarbonSaved: 28}, ReusePotential: 85},
		{SellerID: s.getUserIDByEmail("carol@example.com"), SellerName: "Carol Recycle", Title: "Vintage Hardcover Sci-Fi Collection", Description: "Set of 8 classics. Asimov, Clarke, Herbert.", Category: "books", Condition: "fair", BasePrice: 45, LifecycleData: models.LifecycleData{ManufacturingImpact: 12, UsageMonths: 240, RefurbishmentQuality: 70, ExpectedReuseCycles: 6, MaterialRecyclability: 95, CarbonSaved: 10}, ReusePotential: 95},
		{SellerID: s.getUserIDByEmail("alice@example.com"), SellerName: "Alice Green", Title: "Canon EOS R6 Camera Kit", Description: "Well-maintained. Shutter count: 15k. Includes bag, battery, SD card.", Category: "electronics", Condition: "good", BasePrice: 1299.99, LifecycleData: models.LifecycleData{ManufacturingImpact: 85, UsageMonths: 20, RefurbishmentQuality: 87, ExpectedReuseCycles: 4, MaterialRecyclability: 60, CarbonSaved: 65}, ReusePotential: 85},
		{SellerID: s.getUserIDByEmail("dave@example.com"), SellerName: "Dave Sustain", Title: "Kids' Bicycle — Giant ARX 24", Description: "Outgrown kids' mountain bike. New tires and brakes. Ages 8-12.", Category: "sports", Condition: "good", BasePrice: 165, LifecycleData: models.LifecycleData{ManufacturingImpact: 25, UsageMonths: 30, RefurbishmentQuality: 82, ExpectedReuseCycles: 3, MaterialRecyclability: 88, CarbonSaved: 20}, ReusePotential: 82},
	}
	for i := range demoProducts {
		s.CreateProduct(&demoProducts[i])
	}

	aliceID := s.getUserIDByEmail("alice@example.com")
	bobID := s.getUserIDByEmail("bob@example.com")
	emmaID := s.getUserIDByEmail("emma@example.com")
	daveID := s.getUserIDByEmail("dave@example.com")
	carolID := s.getUserIDByEmail("carol@example.com")

	demoTxs := []models.Transaction{
		{BuyerID: bobID, SellerID: aliceID, FinalPrice: 750, CarbonSaved: 285, PointsEarned: 150},
		{BuyerID: emmaID, SellerID: aliceID, FinalPrice: 180, CarbonSaved: 38, PointsEarned: 80},
		{BuyerID: bobID, SellerID: daveID, FinalPrice: 320, CarbonSaved: 28, PointsEarned: 95},
		{BuyerID: emmaID, SellerID: carolID, FinalPrice: 72, CarbonSaved: 25, PointsEarned: 60},
	}
	for i := range demoTxs {
		tx := &demoTxs[i]
		tx.CreatedAt = time.Now().AddDate(0, -i, -i*5)
		s.CreateTransaction(tx)
	}
}

func (s *AppwriteService) getUserIDByEmail(email string) string {
	if id, exists := s.emailToID[email]; exists {
		return id
	}
	return ""
}

func MarshalLifecycleData(data models.LifecycleData) string {
	b, _ := json.Marshal(data)
	return string(b)
}

func UnmarshalLifecycleData(data string) models.LifecycleData {
	var ld models.LifecycleData
	json.Unmarshal([]byte(data), &ld)
	return ld
}
