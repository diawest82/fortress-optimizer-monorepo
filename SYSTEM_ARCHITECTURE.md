# Fortress Token Optimizer v2.0.0 - System Architecture

## Complete User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER SIGNUP → TIER → ACCESS FLOW                     │
└─────────────────────────────────────────────────────────────────────────────┘

[PHASE 1: SIGNUP]
    User Web Form / Tool
           │
           ▼
    ┌──────────────────────┐
    │  POST /auth/signup   │
    │  {email, password}   │
    └─────────┬────────────┘
              │
              ▼
    ┌────────────────────────────────────────┐
    │  1. Hash password (PBKDF2-SHA256)      │
    │  2. Create user account                │
    │  3. Generate API key (sk_xxx)          │
    │  4. Hash API key (SHA256) for storage  │
    │  5. Create "free" subscription         │
    │  6. Initialize usage tracking          │
    └─────────┬────────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────────────────────┐
    │  RESPONSE:                                       │
    │  • JWT Token (24-hour expiration)               │
    │  • API Key (sk_xxx)                             │
    │  • Tier: "free"                                 │
    │  • User ID: usr_xxx                             │
    └──────────────────────────────────────────────────┘


[PHASE 2: REQUEST WITH API KEY]
    User Tool / API Client
           │
           ▼
    ┌─────────────────────────────┐
    │  POST /optimize             │
    │  Header: Authorization:     │
    │  Bearer sk_xxx              │
    └────────────┬────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────────┐
    │  DEPENDENCY: verify_api_key_with_tier()            │
    │  ┌──────────────────────────────────────────────┐  │
    │  │ 1. Look up API key in api_keys_db           │  │
    │  │    api_key_hash = SHA256(sk_xxx)            │  │
    │  │ 2. Get user_id from match                   │  │
    │  │ 3. Look up user tier from subscriptions_db  │  │
    │  │    user_id → {tier: "free"}                 │  │
    │  │ 4. Return: {user_id, email, tier, usage}   │  │
    │  └──────────────────────────────────────────────┘  │
    └────────────┬───────────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────────────────────┐
    │  TIER IS NOW KNOWN & ENFORCED                        │
    │  ┌────────────────────────────────────────────────┐  │
    │  │ STEP 1: Check Rate Limit                      │  │
    │  │  if requests_this_minute >= TIER_LIMITS[tier] │  │
    │  │         ["requests_per_minute"]:              │  │
    │  │    return 429 "Rate limit exceeded"           │  │
    │  │                                                │  │
    │  │ STEP 2: Check Monthly Quota                   │  │
    │  │  if tokens_used_this_month >= TIER_LIMITS[tier]│  │
    │  │         ["monthly_tokens"]:                   │  │
    │  │    return 429 "Monthly quota exceeded"        │  │
    │  │                                                │  │
    │  │ STEP 3: Check Feature Access                  │  │
    │  │  if request.provider != "openai" AND          │  │
    │  │     tier == "free":                           │  │
    │  │    return 403 "Requires Pro tier"             │  │
    │  │                                                │  │
    │  │ STEP 4: Execute & Track                       │  │
    │  │  run_optimization(request)                    │  │
    │  │  usage_db[user_id:YYYY-MM]["tokens"] += 100  │  │
    │  │                                                │  │
    │  │ STEP 5: Return Result                         │  │
    │  │  {status, tokens_saved, remaining_quota}     │  │
    │  └────────────────────────────────────────────────┘  │
    └──────────────────────────────────────────────────────┘


[PHASE 3: USER UPGRADES]
    User clicks "Upgrade to Pro"
           │
           ▼
    ┌──────────────────────────────┐
    │  POST /billing/upgrade        │
    │  {tier: "pro", cycle: "mly"} │
    │  Header: Authorization: JWT  │
    └────────┬─────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │ 1. Validate JWT token                   │
    │ 2. Get user_id from JWT                 │
    │ 3. Update subscriptions_db:             │
    │    subscriptions_db[user_id] =          │
    │      {tier: "pro", status: "active"}    │
    │ 4. Deactivate old "free" subscription   │
    │ 5. Return new subscription details      │
    └────────┬────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────┐
    │  RESPONSE:                               │
    │  • Tier: "pro"                           │
    │  • Status: "active"                      │
    │  • Price: $9.99/month                    │
    │  • Next billing: 2024-02-15              │
    └──────────────────────────────────────────┘


[PHASE 4: NEXT REQUEST WITH SAME API KEY]
    User makes another /optimize request
    with same sk_xxx API key
           │
           ▼
    ┌────────────────────────────────────────┐
    │ verify_api_key_with_tier() looks up:   │
    │ • subscriptions_db[user_id]             │
    │ • NOW finds: {tier: "pro"}              │
    │ • returns: {tier: "pro", ...}           │
    └─────────┬──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────────────┐
    │ NEW TIER LIMITS ENFORCED:                │
    │ • Rate limit: 100 req/min (not 10)      │
    │ • Monthly quota: 500K tokens (not 50K)  │
    │ • Providers: ALL available (not just OAI) │
    │ • Features: API access enabled          │
    └──────────────────────────────────────────┘
    
    RESULT: User can now access:
    ✅ Anthropic Claude models
    ✅ Cohere models  
    ✅ 13 other providers
    ✅ 10x higher monthly quota
    ✅ 10x faster rate limit
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                        │
└─────────────────────────────────────────────────────────────┘

USERS TABLE (In-Memory & PostgreSQL)
┌──────────────────────────────────────┐
│ users_db {user_id → {                │
│   id: "usr_abc123xyz",              │
│   email: "user@example.com",        │
│   password_hash: "pbkdf2:...",      │
│   created_at: "2024-01-15T10:30Z",  │
│   updated_at: "2024-01-15T10:35Z"   │
│ }}                                   │
└──────────────────────────────────────┘
         │
         │ Foreign Key: user_id
         ├──────────────────┬───────────────┬──────────────┐
         │                  │               │              │
         ▼                  ▼               ▼              ▼
    
    API_KEYS TABLE          SUBSCRIPTIONS TABLE      USAGE TABLE
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐
    │ api_keys_db {    │    │ subscriptions_db │    │ usage_db {   │
    │ key_hash → {     │    │ {user_id → {     │    │ "user:mth" →│
    │  user_id,        │    │  tier: "free",   │    │ {            │
    │  name: "Default",│    │  status:         │    │  tokens: 100,│
    │  created_at,     │    │  "active",       │    │  opts: 10,   │
    │  expires_at      │    │  stripe_id,      │    │  providers:[]│
    │ }}               │    │  start_date,     │    │ }}           │
    └──────────────────┘    │  end_date        │    └──────────────┘
                            │ }}               │
                            └──────────────────┘

RATE_LIMIT CACHE (Redis/Memory)
┌──────────────────────────────────────┐
│ rate_limit_store {                   │
│   "user_id:rate_limit" → [           │
│     1705316400.5,  // Unix timestamp  │
│     1705316401.2,                    │
│     1705316402.8   // Last 60 sec     │
│   ]                                  │
│ }                                    │
└──────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────────────────────────────────────────────────┐
│          AUTHENTICATION MECHANISMS                       │
└──────────────────────────────────────────────────────────┘

METHOD 1: API KEY AUTHENTICATION (For /optimize endpoint)
├─ Use Case: Tool/extension making API calls
├─ Header: Authorization: Bearer sk_test_abc123xyz...
├─ Validation: 
│  1. Extract key from header
│  2. Hash with SHA256
│  3. Look up in api_keys_db
│  4. Get user_id from match
│  5. Lookup tier in subscriptions_db
│  6. Enforce tier limits
└─ Best For: Long-lived programmatic access

METHOD 2: JWT TOKEN AUTHENTICATION (For /users/* endpoints)
├─ Use Case: Web/mobile UI, account management
├─ Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
├─ Validation:
│  1. Extract token from header
│  2. Verify signature with JWT_SECRET
│  3. Check expiration (24 hours)
│  4. Decode payload: {user_id, email, tier, exp}
│  5. Return user data
└─ Best For: Session-based UI authentication

METHOD 3: EMAIL/PASSWORD (For /auth/login endpoint)
├─ Use Case: User login
├─ Body: {email: "user@example.com", password: "..."}
├─ Validation:
│  1. Look up user by email
│  2. Hash provided password with PBKDF2
│  3. Constant-time compare with stored hash
│  4. Generate JWT + API key on match
│  5. Return tokens
└─ Best For: Initial authentication
```

## Tier Enforcement Logic

```
┌────────────────────────────────────────────────────────┐
│           TIER-BASED LIMITS ENFORCEMENT                │
└────────────────────────────────────────────────────────┘

TIER CONFIGURATION
┌──────────────────────────────────────────────────────┐
│ TIER_LIMITS = {                                      │
│   "free": {                                          │
│     "monthly_tokens": 50_000,                        │
│     "requests_per_minute": 10,                       │
│     "features": {                                    │
│       "all_providers": False,                        │
│       "api_access": False,                           │
│       "email_support": False                         │
│     }                                                │
│   },                                                 │
│   "pro": {                                           │
│     "monthly_tokens": 500_000,                       │
│     "requests_per_minute": 100,                      │
│     "features": {                                    │
│       "all_providers": True,    ← All 16 providers  │
│       "api_access": True,                            │
│       "email_support": True                          │
│     }                                                │
│   },                                                 │
│   "team": {                                          │
│     "monthly_tokens": 50_000_000,                    │
│     "requests_per_minute": 1000,                     │
│     "features": {                                    │
│       "all_providers": True,                         │
│       "api_access": True,                            │
│       "email_support": True                          │
│     }                                                │
│   }                                                  │
│ }                                                    │
└──────────────────────────────────────────────────────┘

ENFORCEMENT CHECKS (on each /optimize request)
┌──────────────────────────────────────────────────────┐
│ get_user_tier(api_key) → tier = "free"              │
│                                                      │
│ if tier not in TIER_LIMITS:                         │
│    return 400 "Invalid tier"                        │
│                                                      │
│ limit = TIER_LIMITS[tier]                          │
│                                                      │
│ CHECK 1: RATE LIMIT                                 │
│ if requests_this_minute >= limit["requests_per_min"]│
│    return 429 "Rate limit exceeded"                 │
│                                                      │
│ CHECK 2: MONTHLY QUOTA                              │
│ if tokens_used_this_month >= limit["monthly_tokens"]│
│    return 429 "Monthly quota exceeded"              │
│                                                      │
│ CHECK 3: FEATURE ACCESS                             │
│ if request.provider != "openai":                    │
│    if not limit["features"]["all_providers"]:       │
│       return 403 "Requires Pro tier"                │
│                                                      │
│ if all checks pass:                                 │
│    execute_optimization()                          │
│    track_usage(tokens_used)                        │
│    return result_with_remaining_quota()            │
└──────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│              MULTI-LAYER SECURITY                       │
└─────────────────────────────────────────────────────────┘

LAYER 1: PASSWORD SECURITY
├─ Algorithm: PBKDF2-HMAC-SHA256
├─ Iterations: 100,000 (NIST recommended)
├─ Salt: Random per user
├─ Comparison: Constant-time (prevents timing attacks)
└─ Storage: Hash only (plaintext never stored)

LAYER 2: API KEY SECURITY
├─ Generation: cryptographically random (secrets module)
├─ Format: sk_test_<random> or sk_live_<random>
├─ Hashing: SHA256 before storage
├─ Rotation: Users can create new keys anytime
├─ Revocation: Can delete keys individually
└─ Storage: Hash only (key shown once)

LAYER 3: JWT TOKEN SECURITY
├─ Algorithm: HS256 (HMAC with SHA-256)
├─ Secret: 32+ character random string
├─ Expiration: 24 hours
├─ Payload: {user_id, email, tier, exp}
├─ Validation: Signature + expiration checked
├─ Refresh: /auth/refresh endpoint for new token
└─ Storage: Client-side (httpOnly cookie recommended)

LAYER 4: REQUEST VALIDATION
├─ CORS: Cross-origin requests validated
├─ Headers: Security headers enforced
│  ├─ Content-Security-Policy
│  ├─ X-Frame-Options: DENY
│  ├─ X-Content-Type-Options: nosniff
│  ├─ Strict-Transport-Security (HTTPS)
│  └─ X-XSS-Protection
├─ Input: Pydantic validation on all fields
├─ Escaping: HTML escaping for text fields
└─ Rate Limiting: Per-user, per-tier

LAYER 5: QUOTA ENFORCEMENT
├─ Monthly Tracking: Per-user usage in usage_db
├─ Hard Limit: 429 error if quota exceeded
├─ Reset: 1st of each month
├─ Verification: Checked before each request
└─ Transparency: User can see remaining quota

LAYER 6: ACCESS CONTROL
├─ Authentication: Required for all protected endpoints
├─ Authorization: Tier determines what's allowed
├─ Features: Tier-based provider/feature access
├─ Rate Limits: Tier-specific request limits
└─ Audit: User ID & timestamp logged with all requests
```

## Endpoint Architecture

```
┌────────────────────────────────────────────────────────┐
│            20+ ENDPOINTS BY CATEGORY                   │
└────────────────────────────────────────────────────────┘

AUTHENTICATION ENDPOINTS (4)
  POST   /auth/signup          → Create account + API key
  POST   /auth/login           → Email/password auth
  GET    /auth/refresh         → Refresh JWT token
  (DEP)  verify_api_key_with_tier()

USER MANAGEMENT (2)
  GET    /users/profile        → Profile info
  POST   /users/change-password → Update password

API KEY MANAGEMENT (3)
  GET    /api-keys             → List all keys
  POST   /api-keys             → Create new key
  DELETE /api-keys/{name}      → Delete key

OPTIMIZATION (1)
  POST   /optimize             → Tier-aware token optimization

USAGE & ANALYTICS (3)
  GET    /usage                → Monthly usage info
  GET    /providers            → Available providers (tier-filtered)
  GET    /analytics            → Detailed analytics

BILLING & SUBSCRIPTIONS (4)
  GET    /billing/subscription → Current subscription
  POST   /billing/checkout     → Stripe checkout session
  POST   /billing/upgrade      → Upgrade to Pro/Team
  POST   /billing/cancel       → Downgrade to Free

PRICING (1)
  GET    /pricing              → All plans + features

HEALTH CHECKS (2)
  GET    /health               → System health
  GET    /                     → API info + endpoints list

Total: 20+ endpoints, all documented, all tested
```

## Technology Stack

```
┌──────────────────────────────────────────┐
│       v2.0.0 TECHNOLOGY STACK           │
└──────────────────────────────────────────┘

FRAMEWORK
├─ FastAPI 0.100+
└─ Pydantic v2 (validation)

SECURITY
├─ Cryptography (key generation)
├─ PyJWT (JWT tokens)
├─ PBKDF2 (password hashing)
├─ Secrets (random generation)
└─ Python-dotenv (configuration)

DATABASES
├─ Development: In-memory Python dicts
└─ Production: PostgreSQL
   ├─ SQLAlchemy ORM
   ├─ Connection pooling (psycopg2)
   └─ Migrations (Alembic)

PAYMENT
├─ Stripe API
├─ Webhook validation
└─ Subscription management

DEPLOYMENT
├─ Python 3.10+
├─ Uvicorn (ASGI server)
├─ Docker (containerization)
├─ nginx (reverse proxy)
└─ Let's Encrypt (HTTPS)

MONITORING
├─ Logging (Python logging)
├─ Error tracking (Sentry)
├─ Metrics (Prometheus)
└─ Performance monitoring

TESTING
├─ pytest
├─ curl/bash scripts
├─ Postman collections
└─ Load testing (locust)
```

This architecture provides a complete, production-ready user authentication and tier-based access control system for the Fortress Token Optimizer.
