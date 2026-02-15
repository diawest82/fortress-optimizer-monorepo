# Fortress Token Optimizer v2.0.0 - User Authentication System Guide

## Overview

This guide explains how the complete user authentication and tier-based access system works in v2.0.0.

## Architecture Flow

```
┌─────────────────┐
│   User Signs Up │
│ (email/password)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ POST /auth/signup           │
│ Returns: JWT + API Key      │
│ Tier: Free (default)        │
└────────┬────────────────────┘
         │
         ├─→ JWT Token (24-hour expiration)
         │   Used for: account/profile endpoints
         │   Header: Authorization: Bearer jwt_token
         │
         └─→ API Key (sk_xxx)
             Used for: optimization endpoints
             Header: Authorization: Bearer sk_xxx
             
         
         ▼
┌────────────────────────┐
│ User Makes Request    │
│ with API Key or JWT   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ verify_api_key_with_tier() or             │
│ verify_jwt_token()                         │
│ Returns: {user_id, email, tier, usage}   │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Enforce Tier Limits:                       │
│ • Rate limit (10/100/1000 req/min)        │
│ • Monthly quota (50K/500K/50M tokens)     │
│ • Feature access (basic/all providers)    │
└────────────────────────────────────────────┘
```

## Authentication Endpoints

### 1. User Signup

**Endpoint:** `POST /auth/signup`

Creates a new user account and generates an API key.

```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response (200):**
```json
{
  "user_id": "usr_abc123xyz",
  "email": "user@example.com",
  "tier": "free",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "api_key": "sk_test_abc123xyz789..."
}
```

**Default Tier:** Free
- 50,000 tokens/month
- 10 requests/minute
- OpenAI provider only
- $0/month

### 2. User Login

**Endpoint:** `POST /auth/login`

Authenticate with email and password, get JWT token.

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "api_key": "sk_test_abc123xyz789...",
  "tier": "free"
}
```

### 3. Refresh JWT Token

**Endpoint:** `GET /auth/refresh`

Refresh an expired JWT token.

```bash
curl -X GET http://localhost:8000/auth/refresh \
  -H "Authorization: Bearer current_jwt_token"
```

## Account Endpoints

### 1. Get User Profile

**Endpoint:** `GET /users/profile`

Requires: JWT Token

```bash
curl -X GET http://localhost:8000/users/profile \
  -H "Authorization: Bearer jwt_token"
```

**Response (200):**
```json
{
  "user_id": "usr_abc123xyz",
  "email": "user@example.com",
  "tier": "free",
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-15T10:35:00Z"
}
```

### 2. Change Password

**Endpoint:** `POST /users/change-password`

Requires: JWT Token

```bash
curl -X POST http://localhost:8000/users/change-password \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "OldPassword123!",
    "new_password": "NewPassword456!"
  }'
```

## API Key Management

### 1. List API Keys

**Endpoint:** `GET /api-keys`

Requires: JWT Token

```bash
curl -X GET http://localhost:8000/api-keys \
  -H "Authorization: Bearer jwt_token"
```

**Response (200):**
```json
{
  "keys": [
    {
      "name": "Default",
      "key": "sk_test_abc123...",
      "created_at": "2024-01-15T10:30:00Z",
      "last_used": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### 2. Create New API Key

**Endpoint:** `POST /api-keys`

Requires: JWT Token

```bash
curl -X POST http://localhost:8000/api-keys \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Integration Server"}'
```

**Response (200):**
```json
{
  "name": "Integration Server",
  "key": "sk_test_xyz789abc...",
  "created_at": "2024-01-15T11:00:00Z"
}
```

### 3. Delete API Key

**Endpoint:** `DELETE /api-keys/{name}`

Requires: JWT Token

```bash
curl -X DELETE http://localhost:8000/api-keys/Integration%20Server \
  -H "Authorization: Bearer jwt_token"
```

## Usage & Analytics

### 1. Get Monthly Usage

**Endpoint:** `GET /usage`

Requires: API Key or JWT Token

```bash
curl -X GET http://localhost:8000/usage \
  -H "Authorization: Bearer api_key_or_jwt"
```

**Response (200):**
```json
{
  "monthly_tokens_used": 15000,
  "monthly_tokens_limit": 50000,
  "percentage_used": 30.0,
  "remaining_monthly_tokens": 35000,
  "reset_date": "2024-02-15T00:00:00Z",
  "current_month": "2024-01"
}
```

### 2. Get Available Providers

**Endpoint:** `GET /providers`

Requires: API Key or JWT Token

Returns providers available for the user's tier.

```bash
curl -X GET http://localhost:8000/providers \
  -H "Authorization: Bearer api_key_or_jwt"
```

**Free Tier Response:**
```json
{
  "providers": [
    {
      "name": "openai",
      "models": ["gpt-3.5-turbo", "gpt-4-turbo-preview"]
    }
  ]
}
```

**Pro/Team Tier Response:**
```json
{
  "providers": [
    {
      "name": "openai",
      "models": ["gpt-3.5-turbo", "gpt-4-turbo-preview"]
    },
    {
      "name": "anthropic",
      "models": ["claude-opus", "claude-sonnet"]
    },
    {
      "name": "cohere",
      "models": ["command", "command-light"]
    }
    // ... more providers (16 total)
  ]
}
```

### 3. Get Analytics

**Endpoint:** `GET /analytics`

Requires: JWT Token

```bash
curl -X GET http://localhost:8000/analytics \
  -H "Authorization: Bearer jwt_token"
```

**Response (200):**
```json
{
  "monthly_usage": {
    "2024-01": {
      "tokens": 15000,
      "optimizations": 30,
      "providers_used": ["openai"]
    }
  },
  "tier": "free",
  "requests_this_month": 125,
  "rate_limit_remaining": 235
}
```

## Token Optimization

### Optimize Tokens

**Endpoint:** `POST /optimize`

Requires: API Key

This endpoint:
1. Validates API key and gets user tier
2. Checks rate limit (10/100/1000 req/min based on tier)
3. Checks monthly quota (50K/500K/50M tokens based on tier)
4. Checks provider access (OpenAI only for Free, all for Pro/Team)
5. Deducts tokens from user's monthly quota

```bash
curl -X POST http://localhost:8000/optimize \
  -H "Authorization: Bearer sk_test_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "text": "Optimize this prompt to be more efficient"
  }'
```

**Response (200):**
```json
{
  "status": "success",
  "original_tokens": 100,
  "optimized_tokens": 75,
  "saved_tokens": 25,
  "percentage_saved": 25.0,
  "tier": "free",
  "remaining_monthly_tokens": 35000,
  "monthly_tokens_used": 15000
}
```

**Error Responses:**

Rate Limit Exceeded (429):
```json
{
  "detail": "Rate limit exceeded for free tier (10 requests per minute)"
}
```

Monthly Quota Exceeded (429):
```json
{
  "detail": "Monthly quota exceeded. Please upgrade your plan."
}
```

Feature Not Available (403):
```json
{
  "detail": "Provider 'anthropic' requires Pro or Team tier"
}
```

## Billing & Subscriptions

### 1. Get Current Subscription

**Endpoint:** `GET /billing/subscription`

Requires: JWT Token

```bash
curl -X GET http://localhost:8000/billing/subscription \
  -H "Authorization: Bearer jwt_token"
```

**Response (200):**
```json
{
  "tier": "free",
  "status": "active",
  "price": 0.0,
  "billing_cycle": "monthly",
  "current_period_start": "2024-01-15T00:00:00Z",
  "current_period_end": "2024-02-15T00:00:00Z",
  "next_billing_date": "2024-02-15T00:00:00Z"
}
```

### 2. Upgrade Subscription

**Endpoint:** `POST /billing/upgrade`

Requires: JWT Token

```bash
curl -X POST http://localhost:8000/billing/upgrade \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "pro",
    "billing_cycle": "monthly"
  }'
```

**Response (200):**
```json
{
  "tier": "pro",
  "status": "active",
  "price": 9.99,
  "billing_cycle": "monthly",
  "next_billing_date": "2024-02-15T00:00:00Z",
  "stripe_subscription_id": "sub_stripe123xyz"
}
```

### 3. Create Checkout Session

**Endpoint:** `POST /billing/checkout`

Requires: JWT Token

Creates a Stripe checkout session for payment.

```bash
curl -X POST http://localhost:8000/billing/checkout \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "pro",
    "billing_cycle": "monthly"
  }'
```

**Response (200):**
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_..."
}
```

### 4. Cancel Subscription

**Endpoint:** `POST /billing/cancel`

Requires: JWT Token

Downgrades user to Free tier.

```bash
curl -X POST http://localhost:8000/billing/cancel \
  -H "Authorization: Bearer jwt_token"
```

**Response (200):**
```json
{
  "tier": "free",
  "status": "downgraded",
  "message": "Subscription cancelled. Your account has been downgraded to Free tier."
}
```

## Pricing Information

### Get All Pricing Plans

**Endpoint:** `GET /pricing`

No authentication required.

```bash
curl -X GET http://localhost:8000/pricing
```

**Response (200):**
```json
{
  "tiers": [
    {
      "name": "Free",
      "tier": "free",
      "price": 0.0,
      "monthly_tokens": 50000,
      "requests_per_minute": 10,
      "features": {
        "basic_optimization": true,
        "all_providers": false,
        "api_access": false,
        "email_support": false
      }
    },
    {
      "name": "Pro",
      "tier": "pro",
      "price": 9.99,
      "monthly_tokens": 500000,
      "requests_per_minute": 100,
      "features": {
        "basic_optimization": true,
        "all_providers": true,
        "api_access": true,
        "email_support": true
      }
    },
    {
      "name": "Team",
      "tier": "team",
      "price": 99.0,
      "monthly_tokens": 50000000,
      "requests_per_minute": 1000,
      "features": {
        "basic_optimization": true,
        "all_providers": true,
        "api_access": true,
        "email_support": true
      }
    }
  ]
}
```

## Security Features

### Password Security
- Hashing: PBKDF2-HMAC-SHA256
- Iterations: 100,000
- Salt: Per-user random salt
- Constant-time comparison to prevent timing attacks

### API Key Security
- Format: `sk_test_` or `sk_live_` prefix
- Hashing: SHA256 before storage
- Never logged or displayed after creation
- Can be rotated by creating new keys

### JWT Token Security
- Algorithm: HS256 (HMAC with SHA-256)
- Expiration: 24 hours
- Payload: {user_id, email, tier, exp}
- Refresh endpoint to get new token

### Rate Limiting
- Per-user tracking
- 60-second rolling window
- Tier-specific limits:
  - Free: 10 requests/minute
  - Pro: 100 requests/minute
  - Team: 1000 requests/minute

### Monthly Quota Enforcement
- Per-user monthly token tracking
- Reset on 1st of each month
- Checked before each optimization request
- Returns remaining tokens in response

## Testing

Run the complete test suite:

```bash
chmod +x tests/user-system-complete-test.sh
./tests/user-system-complete-test.sh http://localhost:8000
```

Expected output: **11/11 tests passing** ✅

## Environment Configuration

Copy `.env.template` to `.env` and configure:

```bash
cp .env.template .env
```

Key variables:
- `JWT_SECRET`: Random 32+ character string for signing JWTs
- `STRIPE_SECRET_KEY`: Get from https://dashboard.stripe.com/apikeys
- `STRIPE_PUBLISHABLE_KEY`: Get from https://dashboard.stripe.com/apikeys
- `DATABASE_URL`: PostgreSQL connection string (for production)

## Database Schema

### Users Table
```sql
users: {
  id: String (usr_xxx),
  email: String (unique),
  password_hash: String (PBKDF2),
  created_at: DateTime,
  updated_at: DateTime
}
```

### API Keys Table
```sql
api_keys: {
  key_hash: String (SHA256),
  user_id: String (foreign key),
  name: String,
  created_at: DateTime,
  expires_at: DateTime (optional)
}
```

### Subscriptions Table
```sql
subscriptions: {
  user_id: String (foreign key),
  tier: String (free|pro|team),
  status: String (active|cancelled|expired),
  stripe_subscription_id: String (optional),
  current_period_start: DateTime,
  current_period_end: DateTime
}
```

### Usage Table
```sql
usage: {
  user_id: String (foreign key),
  month: String (YYYY-MM),
  tokens_used: Integer,
  optimizations_count: Integer
}
```

### Rate Limit Cache
```sql
rate_limit: {
  key: String (user_id:rate_limit),
  request_timestamps: Array<Float>,
  ttl: 60 seconds
}
```

## Tier Comparison

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| Monthly Tokens | 50K | 500K | 50M |
| Requests/Min | 10 | 100 | 1000 |
| Price | $0 | $9.99 | $99 |
| OpenAI | ✓ | ✓ | ✓ |
| Anthropic | ✗ | ✓ | ✓ |
| Cohere | ✗ | ✓ | ✓ |
| All Providers | ✗ | ✓ | ✓ |
| API Access | ✗ | ✓ | ✓ |
| Email Support | ✗ | ✓ | ✓ |

## Troubleshooting

### "Invalid API key"
- Ensure API key is provided in `Authorization: Bearer sk_xxx` header
- Check key hasn't expired
- Verify key belongs to user account

### "Rate limit exceeded"
- Wait 60 seconds before making another request
- Upgrade to Pro (100/min) or Team (1000/min) tier
- Check current tier with `GET /usage`

### "Monthly quota exceeded"
- Upgrade to higher tier (more tokens per month)
- Wait for next month's quota reset
- Check usage with `GET /usage`

### "Provider not available"
- Feature requires upgrade to Pro or Team tier
- Free tier only supports OpenAI
- Upgrade with `POST /billing/upgrade`

### JWT Token Expired
- Get new token with `GET /auth/refresh`
- Or login again with `POST /auth/login`
- Token expires after 24 hours

## Migration from v1.0.0

If migrating from the previous version:

1. Export existing user data
2. Create `/migrate` endpoint that:
   - Creates accounts for each user
   - Generates API keys with same permissions
   - Assigns appropriate tier based on old plan
   - Preserves usage history
3. Update all tools to use new API key auth
4. Update website to use new signup/login endpoints
5. Test all flows before decommissioning old system

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the test suite output: `tests/user-system-complete-test.sh`
- Check backend logs: `docker logs fortress-backend`
- File issue on GitHub with test output
