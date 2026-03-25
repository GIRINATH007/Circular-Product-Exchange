# Circular Exchange Platform — Backend Guide

Everything you need to understand how this Go backend works, from startup to every API call.

---

## Table of Contents

1. [How Go Works (The Basics)](#1-how-go-works)
2. [Project Structure Explained](#2-project-structure)
3. [Startup Flow — What Happens When You Run the Server](#3-startup-flow)
4. [Request Lifecycle — What Happens When a Request Comes In](#4-request-lifecycle)
5. [Configuration & Environment Variables](#5-configuration)
6. [Middleware — The Security Checkpoints](#6-middleware)
7. [Handlers — The API Controllers](#7-handlers)
8. [Services — The Business Logic Layer](#8-services)
9. [The Dynamic Pricing Engine](#9-pricing-engine)
10. [The Gamification System](#10-gamification)
11. [The Analytics Engine](#11-analytics)
12. [Key Go Concepts Used](#12-go-concepts)
13. [API Reference](#13-api-reference)

---

## 1. How Go Works

Go (Golang) is a compiled, statically-typed language by Google. Key differences from JS/Python:

- **Compiled**: `go build` turns your code into a single executable binary. No runtime needed.
- **Statically typed**: Every variable has a fixed type (`string`, `int`, `float64`). Compiler catches type errors before you run.
- **Package system**: Code is organized into packages. `package main` is the entry point. Each folder is typically one package.
- **Exported vs unexported**: Capital letter = public (`CreateUser`), lowercase = private (`simpleHash`). No `public`/`private` keywords.
- **Error handling**: No try/catch. Functions return `(result, error)`. You check `if err != nil`.
- **Pointers**: `*Config` means "pointer to Config" (a reference, not a copy). `&config` creates a pointer. This avoids copying large structs.
- **Goroutines**: Lightweight threads. `go someFunction()` runs it concurrently. We use `sync.RWMutex` to prevent data races.

---

## 2. Project Structure

```
backend/
├── cmd/server/main.go          ← ENTRY POINT: starts everything
├── internal/                   ← Private app code (can't be imported by others)
│   ├── config/config.go        ← Loads .env file into a Config struct
│   ├── middleware/
│   │   ├── auth.go             ← JWT token validation (security checkpoint)
│   │   └── cors.go             ← Cross-origin request headers
│   ├── models/                 ← Data shapes (structs = blueprints)
│   │   ├── user.go             ← User, RegisterRequest, LoginRequest, etc.
│   │   ├── product.go          ← Product, LifecycleData, CreateProductRequest
│   │   ├── pricing.go          ← PricingBreakdown, PricingConfig
│   │   └── analytics.go        ← Transaction, Badge, LeaderboardEntry, etc.
│   ├── services/               ← Business logic (the "brains")
│   │   ├── appwrite.go         ← Database wrapper (CRUD for users/products/transactions)
│   │   ├── pricing_engine.go   ← Dynamic pricing algorithm (the patentable part!)
│   │   ├── gamification.go     ← Points, badges, leaderboard logic
│   │   └── analytics.go        ← Carbon/waste metrics computation
│   ├── handlers/               ← HTTP request handlers (thin controllers)
│   │   ├── auth.go             ← Register, Login, Profile endpoints
│   │   ├── products.go         ← Product CRUD + Purchase endpoint
│   │   ├── analytics.go        ← Personal/global analytics endpoints
│   │   └── gamification.go     ← Badges, leaderboard, progress endpoints
│   └── routes/routes.go        ← Wires URLs → handlers
├── .env.example                ← Template for environment variables
├── go.mod                      ← Go module definition (like package.json)
└── go.sum                      ← Dependency checksums (like package-lock.json)
```

**The Layered Architecture:**
```
[HTTP Request] → [Middleware] → [Handler] → [Service] → [Database]
                  (security)     (parse     (business    (store/
                                  input,     logic)       retrieve)
                                  return
                                  response)
```

Each layer has ONE job. Handlers don't touch the database. Services don't parse HTTP requests. This separation makes code testable, maintainable, and swappable.

---

## 3. Startup Flow

When you run `go run cmd/server/main.go`, here's what happens step by step:

```
1. main() starts
   ↓
2. config.LoadConfig()
   → Reads .env file using godotenv
   → Creates a Config struct with all settings
   ↓
3. services.NewAppwriteService(cfg)
   → Creates in-memory maps for users/products/transactions
   → Calls seedDemoData() → creates 5 users, 8 products, 4 transactions
   ↓
4. gin.Default()
   → Creates Gin HTTP router with Logger + Recovery middleware built in
   ↓
5. router.Use(middleware.SetupCORS())
   → Adds CORS headers to every response (so frontend on :5173 can call :8080)
   ↓
6. routes.SetupRoutes(router, cfg, db)
   → Creates all service instances (pricing, gamification, analytics)
   → Creates all handler instances with their dependencies injected
   → Registers every URL path → handler function mapping
   → Calls pricingEngine.RecalculateAllPrices() for initial price calculation
   ↓
7. router.Run(":8080")
   → Opens port 8080 and listens for HTTP requests forever
   → BLOCKING CALL — program stays here until you Ctrl+C
```

---

## 4. Request Lifecycle

When someone calls `GET /api/products/abc123`:

```
1. Gin receives the HTTP request
   ↓
2. Logger middleware logs: "GET /api/products/abc123"
   ↓
3. Recovery middleware wraps everything in panic recovery
   ↓
4. CORS middleware adds Access-Control headers to response
   ↓
5. Route matching: /api/products/:id → productHandler.GetProduct
   ↓
6. Handler: GetProduct(c *gin.Context)
   → Extracts "abc123" from URL: c.Param("id")
   → Calls db.GetProduct("abc123")
   → Calls pricing.CalculatePrice(product)
   → Returns JSON response: c.JSON(200, product)
   ↓
7. Response sent back to client
```

For PROTECTED routes (like `POST /api/products`):

```
1-4. Same as above
   ↓
5. Auth middleware runs FIRST:
   → Reads "Authorization: Bearer <token>" header
   → Parses JWT token, verifies signature with secret key
   → Extracts userID and email from token claims
   → Stores in context: c.Set("userID", "...")
   → Calls c.Next() to continue
   ↓
6. Handler runs, retrieves userID: c.Get("userID")
```

---

## 5. Configuration

**Environment variables** store secrets and settings outside your code.

- `.env.example` — Template showing what variables are needed (committed to git)
- `.env` — Actual values with real secrets (NEVER committed to git)

**Why?** If you hardcode `APPWRITE_API_KEY = "abc123"` in source code and push to GitHub, anyone can see your secret key. Env vars keep secrets separate.

**How `config.go` works:**
1. `godotenv.Load()` reads `.env` file, sets values as OS environment variables
2. `os.LookupEnv("KEY")` reads each variable
3. `getEnv("KEY", "fallback")` returns the value or a default if not set
4. All values are stored in a `Config` struct and passed around

---

## 6. Middleware

Middleware is code that runs BEFORE your handler. Think: airport security checkpoints.

### JWT Authentication (`middleware/auth.go`)

**JWT = JSON Web Token**. It's how we do "stateless authentication":

1. User logs in → Server creates a token containing `{userId, email, expiry}`
2. Server signs the token with a secret key (HMAC-SHA256)
3. User stores the token (in browser's localStorage)
4. User sends token in every request header: `Authorization: Bearer <token>`
5. Auth middleware extracts token, verifies signature, extracts user info
6. If valid → adds userID to request context, continues to handler
7. If invalid → returns 401 Unauthorized, stops the chain

**Why stateless?** The server doesn't store sessions. Any server instance can validate any token. This is crucial for scaling to multiple servers.

**Key functions:**
- `GenerateToken(userID, email, secret)` → Creates and signs a JWT
- `AuthMiddleware(secret)` → Returns a Gin middleware function (closure pattern)
- `GetUserIDFromContext(c)` → Retrieves userID that middleware stored

### CORS (`middleware/cors.go`)

**Same-Origin Policy**: Browsers block web pages from calling APIs on different domains/ports.

Your frontend on `http://localhost:5173` calling your backend on `http://localhost:8080` is a **cross-origin request**. Without CORS headers, the browser blocks it.

CORS middleware adds headers like:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

**Preflight requests**: Before POST/PUT/DELETE, browsers send an `OPTIONS` request first to check if CORS is allowed. The middleware handles this automatically.

---

## 7. Handlers

Handlers are the **thin controllers** — they parse input, call services, and format output. They DON'T contain business logic.

### Auth Handler (`handlers/auth.go`)

| Endpoint | Method | Auth? | What it does |
|----------|--------|-------|-------------|
| `/api/auth/register` | POST | No | Creates a new user account, returns JWT |
| `/api/auth/login` | POST | No | Validates credentials, returns JWT |
| `/api/auth/profile` | GET | Yes | Returns current user's profile |
| `/api/auth/profile` | PUT | Yes | Updates display name, bio, avatar |

**Key patterns:**
- `c.ShouldBindJSON(&req)` — Parses JSON body AND validates it using struct tags like `binding:"required,email"`
- Error responses use `gin.H{}` — a shorthand for `map[string]interface{}`
- Login uses generic error: "Invalid email or password" — never reveal which one is wrong (security)

### Product Handler (`handlers/products.go`)

| Endpoint | Method | Auth? | What it does |
|----------|--------|-------|-------------|
| `/api/products` | GET | No | List products with filters (category, price, search) |
| `/api/products/categories` | GET | No | List all categories with counts |
| `/api/products/:id` | GET | No | Get single product with pricing breakdown |
| `/api/products` | POST | Yes | Create new listing |
| `/api/products/:id` | PUT | Yes | Update listing (owner only) |
| `/api/products/:id` | DELETE | Yes | Archive listing (owner only) |
| `/api/products/:id/purchase` | POST | Yes | Buy a product (triggers gamification) |

**Important concepts:**
- **Query params** (`?category=electronics&page=1`) → `c.ShouldBindQuery(&filter)`
- **URL params** (`/products/:id`) → `c.Param("id")`
- **Authorization check**: After authentication, we verify ownership (`product.SellerID != userID`)
- **Purchase flow**: Creates transaction → marks product sold → awards points to buyer AND seller → checks for new badges

### Analytics & Gamification Handlers

Thin wrappers that call their respective services and return JSON. Nothing complex.

---

## 8. Services — The Business Logic Layer

Services contain the actual logic. They NEVER touch HTTP concepts (no `gin.Context`, no status codes).

### Appwrite Service (`services/appwrite.go`)

This is the **data access layer** (also called "Repository Pattern"). ALL database operations go through here.

**Why a wrapper?**
- Currently uses in-memory maps (for development without Appwrite)
- Later, swap the implementation to real Appwrite SDK calls — handlers don't change!
- Centralizes data access — easy to add caching, logging, etc.

**Concurrency safety:**
- `sync.RWMutex` protects the in-memory maps
- `s.mu.Lock()` — exclusive write lock (one writer at a time)
- `s.mu.RLock()` — shared read lock (multiple readers simultaneously)
- `defer s.mu.Unlock()` — automatically unlocks when function returns

**Demo data:**
- `seedDemoData()` creates 5 users, 8 products, and 4 transactions on startup
- Gives the app realistic data to work with immediately

---

## 9. The Dynamic Pricing Engine

**This is the patentable core.** Located in `services/pricing_engine.go`.

### The Formula

```
DynamicPrice = BasePrice × LifecycleMultiplier × DemandFactor
               × (1 - SustainabilityDiscount) × (1 - TimeDecay)
```

### Step-by-step breakdown:

**Step 1: Lifecycle Score (0-100)**

A weighted average measuring product quality + sustainability:
- Refurbishment quality × 35% weight
- Reuse potential (expected remaining cycles) × 25%
- Material recyclability × 20%
- Manufacturing impact (inverse — lower impact = higher score) × 20%
- Condition bonus: like_new +10, good +5, fair 0, poor -10

**Step 2: Lifecycle Multiplier (0.5 to 1.2)**

Maps the 0-100 score to a price multiplier using linear interpolation:
- Score 0 → 0.5× (poor quality = 50% of base price)
- Score 50 → 0.85× (average)
- Score 100 → 1.2× (premium quality = 120% of base price)

**Step 3: Demand Factor (0.8 to 1.3)**

Based on supply/demand economics:
- Category popularity weights (electronics = 1.15, books = 0.90)
- Supply adjustment: < 5 items = +10% premium, > 20 items = -10% discount
- Clamped to min 0.8, max 1.3

**Step 4: Sustainability Discount (0 to 25%)**

THE KEY INCENTIVE. More carbon saved = bigger discount:
- Uses a square-root curve (fast growth at start, diminishing returns)
- 50kg CO2 saved → ~10% discount
- 200kg saved → ~21% discount
- 300+ kg saved → 25% max discount

**Step 5: Time Decay (0 to 15%)**

Items listed > 30 days gradually lose price:
- 1% per week after the 30-day grace period
- Caps at 15% maximum decay

**Step 6: Final Price**

Multiply everything together, round to 2 decimal places, enforce minimum of 10% of base price.

### Pricing Config

All weights and bounds are in `PricingConfig` struct with sensible defaults. Tunable without code changes.

---

## 10. The Gamification System

Located in `services/gamification.go`.

### Points System

Points are earned from transactions:
- 1 point per kg of CO2 saved
- Bonus: +25 for 50+ kg saved, +50 for 100+ kg saved
- Value bonus: 1 point per $50 transaction value

### Levels

| Points | Level | Title |
|--------|-------|-------|
| 0+ | 1 | Eco Seedling |
| 100+ | 2 | Green Sprout |
| 300+ | 3 | Sustainability Scout |
| 600+ | 4 | Eco Champion |
| 1000+ | 5 | Green Guardian |
| 2000+ | 6 | Planet Protector |
| 5000+ | 7 | Earth Ambassador |
| 10000+ | 8 | Sustainability Legend |

### Badges

10 badges across 4 tiers (bronze → silver → gold → platinum). Examples:
- 🌱 First Exchange (1 transaction)
- 🛡️ Eco Warrior (50kg CO2 saved)
- 👑 Top Contributor (#1 on leaderboard)

`CheckAndAwardBadges()` is called after every purchase, evaluates all badge criteria.

### Leaderboard

Ranks users by `sustainabilityScore` (descending). Returns top 20.

---

## 11. The Analytics Engine

Located in `services/analytics.go`.

### Personal Analytics

Aggregates a user's transactions into:
- Total carbon saved, waste reduced
- Monthly breakdown (for line charts)
- Category breakdown (for pie charts)
- Impact equivalents (trees planted, car miles avoided, lightbulb hours)

### Global Analytics

Platform-wide metrics:
- Total users, exchanges, active listings
- Platform-wide carbon savings and waste reduction
- Includes baseline numbers so platform doesn't look empty

---

## 12. Key Go Concepts Used

### Structs (like classes)
```go
type User struct {
    Name string
    Age  int
}
user := User{Name: "Alice", Age: 25}
```

### Methods (functions on structs)
```go
func (u *User) Greet() string {
    return "Hi, I'm " + u.Name
}
```

### JSON Tags
```go
type User struct {
    DisplayName string `json:"displayName"` // JSON key = "displayName"
}
```

### Interfaces (contracts)
Go uses "duck typing" — if a type has the right methods, it implements the interface. No `implements` keyword.

### Error Handling
```go
user, err := db.GetUser(id)
if err != nil {
    // handle error
    return
}
// use user
```

### Closures
```go
func AuthMiddleware(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // This inner function "closes over" the secret variable
        // It can access secret even after AuthMiddleware returns
    }
}
```

### Slices and Maps
```go
users := []string{"alice", "bob"}        // Slice (dynamic array)
scores := map[string]int{"alice": 100}   // Map (dictionary)
```

### Goroutines and Mutexes
```go
var mu sync.RWMutex
mu.RLock()   // Multiple readers allowed
mu.RUnlock()
mu.Lock()    // Only one writer
mu.Unlock()
```

### Defer
```go
mu.Lock()
defer mu.Unlock() // Runs when function returns, even if it panics
```

---

## 13. API Reference

Base URL: `http://localhost:8080`

### Authentication
```
POST /api/auth/register    Body: {email, password, displayName, role}  → {token, user}
POST /api/auth/login       Body: {email, password}                      → {token, user}
GET  /api/auth/profile     Header: Authorization: Bearer <token>        → user
PUT  /api/auth/profile     Header: Auth + Body: {displayName, bio}      → user
```

### Products
```
GET    /api/products                    ?category=&condition=&minPrice=&maxPrice=&q=&page=&limit=
GET    /api/products/categories         → [{id, name, icon, count}]
GET    /api/products/:id                → product with pricingBreakdown
POST   /api/products         [AUTH]     Body: {title, description, category, condition, basePrice, lifecycleData}
PUT    /api/products/:id     [AUTH]     Body: {title, description, basePrice, ...}
DELETE /api/products/:id     [AUTH]     → 204 No Content
POST   /api/products/:id/purchase [AUTH] → {transaction, pointsEarned, newBadges}
```

### Analytics
```
GET /api/analytics/global              → {analytics, impactSummary}
GET /api/analytics/personal  [AUTH]    → {analytics, impactSummary}
```

### Gamification
```
GET /api/gamification/badges           → [badges]
GET /api/gamification/leaderboard      → [leaderboardEntries]
GET /api/gamification/my-progress [AUTH] → {currentPoints, level, badges, rank}
```

### Health
```
GET /api/health → {status: "healthy", service, version}
```
