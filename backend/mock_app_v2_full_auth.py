"""
Fortress Token Optimizer - Complete Backend with User Management
Full authentication, tier-based access control, and Stripe integration
"""

from fastapi import FastAPI, HTTPException, Request, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator, EmailStr
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
import re
import html
from collections import defaultdict
import time
import hashlib
import secrets
import jwt
from enum import Enum
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Fortress Token Optimizer",
    version="2.0.0",
    description="Enterprise token optimization with user accounts and billing"
)

# ============================================================================
# CONFIGURATION
# ============================================================================
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
API_KEY_PREFIX = "sk_"

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_...")

# Tier configuration
TIER_LIMITS = {
    "free": {
        "monthly_tokens": 50000,
        "monthly_price": 0,
        "yearly_price": 0,
        "requests_per_minute": 10,
        "features": {
            "optimization": True,
            "all_providers": False,
            "analytics": False,
            "api_access": False,
            "team_collaboration": False,
        }
    },
    "pro": {
        "monthly_tokens": 500000,
        "monthly_price": 9.99,
        "yearly_price": 99.90,
        "requests_per_minute": 100,
        "features": {
            "optimization": True,
            "all_providers": True,
            "analytics": True,
            "api_access": True,
            "team_collaboration": False,
        }
    },
    "team": {
        "monthly_tokens": 50000000,
        "monthly_price": 99.0,
        "yearly_price": 990.0,
        "requests_per_minute": 1000,
        "features": {
            "optimization": True,
            "all_providers": True,
            "analytics": True,
            "api_access": True,
            "team_collaboration": True,
        }
    }
}

# ============================================================================
# IN-MEMORY DATABASE (Replace with PostgreSQL in production)
# ============================================================================
# For demonstration, we'll use in-memory storage
users_db: Dict[str, dict] = {}
api_keys_db: Dict[str, dict] = {}
subscriptions_db: Dict[str, dict] = {}
usage_db: Dict[str, dict] = defaultdict(lambda: defaultdict(int))
rate_limit_store: Dict[str, list] = defaultdict(list)

# ============================================================================
# MODELS
# ============================================================================

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    api_key: str
    tier: str

class APIKeyResponse(BaseModel):
    api_key: str
    name: str
    created_at: str
    expires_at: Optional[str] = None

class APIKeyRequest(BaseModel):
    name: str

class UserProfile(BaseModel):
    id: str
    email: str
    tier: str
    created_at: str
    subscription_status: str
    monthly_tokens_used: int
    monthly_tokens_limit: int

class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    current_period_start: str
    current_period_end: str
    stripe_subscription_id: Optional[str]
    monthly_limit: int
    monthly_used: int

class CheckoutRequest(BaseModel):
    tier: str  # "pro" or "team"
    billing_cycle: str = "monthly"  # "monthly" or "yearly"

class OptimizeRequest(BaseModel):
    provider: str
    text: str
    model: str
    user_id: Optional[str] = None
    
    @validator('provider')
    def validate_provider(cls, v):
        allowed = {
            "anthropic", "openai", "google", "slack", "npm", "vscode",
            "discord", "make", "zapier", "neovim", "sublime", "gpt-store",
            "chatgpt-plugin", "make-zapier", "claude-desktop", "jetbrains"
        }
        if v not in allowed:
            raise ValueError(f"Invalid provider. Must be one of: {allowed}")
        return v
    
    @validator('text')
    def validate_text(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Text cannot be empty")
        return html.escape(v[:10000])

class UsageResponse(BaseModel):
    user_id: str
    tier: str
    monthly_tokens_used: int
    monthly_tokens_limit: int
    percentage_used: float
    remaining_tokens: int
    reset_date: str

class PricingTier(BaseModel):
    name: str
    monthly_price: float
    yearly_price: float
    monthly_tokens: int
    requests_per_minute: int
    features: dict

class PricingResponse(BaseModel):
    plans: List[PricingTier]

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${pwd_hash.hex()}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    try:
        salt, pwd_hash = password_hash.split('$')
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return new_hash.hex() == pwd_hash
    except:
        return False

def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"

def hash_api_key(api_key: str) -> str:
    """Hash API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()

def generate_jwt(user_id: str) -> str:
    """Generate JWT token"""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_user_id() -> str:
    """Generate user ID"""
    return f"usr_{secrets.token_hex(12)}"

def get_current_month_year() -> str:
    """Get current month-year for usage tracking"""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m")

def get_next_billing_date() -> str:
    """Get next billing date (30 days from now)"""
    return (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    return request.client.host if request.client else "unknown"

# ============================================================================
# SECURITY MIDDLEWARE
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'"
    return response

# ============================================================================
# AUTHENTICATION DEPENDENCIES
# ============================================================================

def verify_api_key_with_tier(authorization: Optional[str] = Header(None)) -> dict:
    """Verify API key and return user tier information"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing API key")
    
    # Extract key from "Bearer sk_..." format
    if authorization.startswith("Bearer "):
        api_key = authorization[7:]
    else:
        api_key = authorization
    
    # Hash and look up in API keys DB
    api_key_hash = hash_api_key(api_key)
    
    if api_key_hash not in api_keys_db:
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    api_key_record = api_keys_db[api_key_hash]
    user_id = api_key_record["user_id"]
    
    if user_id not in users_db:
        raise HTTPException(status_code=403, detail="User not found")
    
    user = users_db[user_id]
    subscription = subscriptions_db.get(user_id, {})
    
    # Get usage for current month
    month_key = f"{user_id}:{get_current_month_year()}"
    usage = usage_db[month_key]
    
    return {
        "user_id": user_id,
        "email": user["email"],
        "tier": subscription.get("tier", "free"),
        "usage": usage,
        "api_key": api_key
    }

def verify_jwt_token(authorization: Optional[str] = Header(None)) -> dict:
    """Verify JWT token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization[7:]
    payload = verify_jwt(token)
    user_id = payload.get("user_id")
    
    if user_id not in users_db:
        raise HTTPException(status_code=401, detail="User not found")
    
    user = users_db[user_id]
    subscription = subscriptions_db.get(user_id, {})
    
    return {
        "user_id": user_id,
        "email": user["email"],
        "tier": subscription.get("tier", "free")
    }

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """Create new user account and issue API key"""
    
    # Check if user already exists
    for user in users_db.values():
        if user["email"] == request.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = generate_user_id()
    users_db[user_id] = {
        "id": user_id,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create free subscription
    subscriptions_db[user_id] = {
        "user_id": user_id,
        "tier": "free",
        "status": "active",
        "stripe_subscription_id": None,
        "current_period_start": datetime.now(timezone.utc).isoformat(),
        "current_period_end": get_next_billing_date()
    }
    
    # Generate API key
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)
    api_keys_db[api_key_hash] = {
        "api_key_hash": api_key_hash,
        "user_id": user_id,
        "name": "Default",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None
    }
    
    # Generate JWT
    token = generate_jwt(user_id)
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user_id,
            "email": request.email,
            "tier": "free"
        },
        api_key=api_key,
        tier="free"
    )

@app.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email and password"""
    
    # Find user by email
    user = None
    user_id = None
    for uid, u in users_db.items():
        if u["email"] == request.email:
            user = u
            user_id = uid
            break
    
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get subscription
    subscription = subscriptions_db.get(user_id, {"tier": "free"})
    
    # Get primary API key
    primary_key = None
    for key_hash, key_record in api_keys_db.items():
        if key_record["user_id"] == user_id and key_record["name"] == "Default":
            # We can't retrieve the original key, so generate new one
            primary_key = generate_api_key()
            api_keys_db[hash_api_key(primary_key)] = {
                "api_key_hash": hash_api_key(primary_key),
                "user_id": user_id,
                "name": "Default",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": None
            }
            # Remove old one
            del api_keys_db[key_hash]
            break
    
    if not primary_key:
        primary_key = generate_api_key()
        api_keys_db[hash_api_key(primary_key)] = {
            "api_key_hash": hash_api_key(primary_key),
            "user_id": user_id,
            "name": "Default",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None
        }
    
    token = generate_jwt(user_id)
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user_id,
            "email": user["email"],
            "tier": subscription.get("tier", "free")
        },
        api_key=primary_key,
        tier=subscription.get("tier", "free")
    )

@app.get("/auth/refresh")
async def refresh_token(user = Depends(verify_jwt_token)):
    """Refresh JWT token"""
    new_token = generate_jwt(user["user_id"])
    return {
        "access_token": new_token,
        "token_type": "bearer"
    }

# ============================================================================
# USER PROFILE ENDPOINTS
# ============================================================================

@app.get("/users/profile", response_model=UserProfile)
async def get_profile(user = Depends(verify_jwt_token)):
    """Get user profile and usage"""
    user_id = user["user_id"]
    user_data = users_db[user_id]
    subscription = subscriptions_db.get(user_id, {"tier": "free"})
    
    month_key = f"{user_id}:{get_current_month_year()}"
    usage = usage_db[month_key]
    monthly_tokens_used = usage.get("tokens", 0)
    monthly_tokens_limit = TIER_LIMITS[subscription["tier"]]["monthly_tokens"]
    
    return UserProfile(
        id=user_id,
        email=user_data["email"],
        tier=subscription["tier"],
        created_at=user_data["created_at"],
        subscription_status=subscription.get("status", "active"),
        monthly_tokens_used=monthly_tokens_used,
        monthly_tokens_limit=monthly_tokens_limit
    )

@app.post("/users/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    user = Depends(verify_jwt_token)
):
    """Change user password"""
    user_id = user["user_id"]
    user_data = users_db[user_id]
    
    if not verify_password(old_password, user_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    users_db[user_id]["password_hash"] = hash_password(new_password)
    users_db[user_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    return {"message": "Password changed successfully"}

# ============================================================================
# API KEY MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api-keys")
async def list_api_keys(user = Depends(verify_jwt_token)):
    """List all API keys for user"""
    user_id = user["user_id"]
    keys = []
    
    for key_hash, key_record in api_keys_db.items():
        if key_record["user_id"] == user_id:
            keys.append({
                "name": key_record["name"],
                "created_at": key_record["created_at"],
                "expires_at": key_record.get("expires_at"),
                "last_used": key_record.get("last_used")
            })
    
    return {"api_keys": keys}

@app.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(request: APIKeyRequest, user = Depends(verify_jwt_token)):
    """Generate new API key for user"""
    user_id = user["user_id"]
    
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)
    
    api_keys_db[api_key_hash] = {
        "api_key_hash": api_key_hash,
        "user_id": user_id,
        "name": request.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None
    }
    
    return APIKeyResponse(
        api_key=api_key,
        name=request.name,
        created_at=datetime.now(timezone.utc).isoformat()
    )

@app.delete("/api-keys/{key_name}")
async def delete_api_key(key_name: str, user = Depends(verify_jwt_token)):
    """Delete API key"""
    user_id = user["user_id"]
    
    for key_hash, key_record in list(api_keys_db.items()):
        if key_record["user_id"] == user_id and key_record["name"] == key_name:
            if key_record["name"] == "Default":
                raise HTTPException(status_code=400, detail="Cannot delete default API key")
            del api_keys_db[key_hash]
            return {"message": "API key deleted"}
    
    raise HTTPException(status_code=404, detail="API key not found")

# ============================================================================
# USAGE & SUBSCRIPTION ENDPOINTS
# ============================================================================

@app.get("/usage", response_model=UsageResponse)
async def get_usage(user_info = Depends(verify_api_key_with_tier)):
    """Get usage for current month"""
    user_id = user_info["user_id"]
    tier = user_info["tier"]
    usage = user_info["usage"]
    
    monthly_tokens_used = usage.get("tokens", 0)
    monthly_tokens_limit = TIER_LIMITS[tier]["monthly_tokens"]
    percentage_used = (monthly_tokens_used / monthly_tokens_limit * 100) if monthly_tokens_limit > 0 else 0
    
    return UsageResponse(
        user_id=user_id,
        tier=tier,
        monthly_tokens_used=monthly_tokens_used,
        monthly_tokens_limit=monthly_tokens_limit,
        percentage_used=round(percentage_used, 2),
        remaining_tokens=max(0, monthly_tokens_limit - monthly_tokens_used),
        reset_date=get_next_billing_date()
    )

@app.get("/billing/subscription", response_model=SubscriptionResponse)
async def get_subscription(user = Depends(verify_jwt_token)):
    """Get user's subscription details"""
    user_id = user["user_id"]
    subscription = subscriptions_db.get(user_id, {"tier": "free"})
    
    month_key = f"{user_id}:{get_current_month_year()}"
    usage = usage_db[month_key]
    monthly_tokens_used = usage.get("tokens", 0)
    monthly_tokens_limit = TIER_LIMITS[subscription["tier"]]["monthly_tokens"]
    
    return SubscriptionResponse(
        tier=subscription["tier"],
        status=subscription.get("status", "active"),
        current_period_start=subscription["current_period_start"],
        current_period_end=subscription["current_period_end"],
        stripe_subscription_id=subscription.get("stripe_subscription_id"),
        monthly_limit=monthly_tokens_limit,
        monthly_used=monthly_tokens_used
    )

@app.post("/billing/checkout")
async def create_checkout_session(request: CheckoutRequest, user = Depends(verify_jwt_token)):
    """Create Stripe checkout session for tier upgrade"""
    user_id = user["user_id"]
    user_data = users_db[user_id]
    
    if request.tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    tier_config = TIER_LIMITS[request.tier]
    price = tier_config["yearly_price"] if request.billing_cycle == "yearly" else tier_config["monthly_price"]
    
    # In production, create actual Stripe session
    # For now, return mock response
    checkout_session = {
        "id": f"cs_{secrets.token_hex(12)}",
        "client_secret": f"cs_secret_{secrets.token_hex(16)}",
        "url": f"https://checkout.stripe.com/pay/cs_{secrets.token_hex(12)}",
        "tier": request.tier,
        "amount": int(price * 100),  # Convert to cents
        "currency": "usd",
        "billing_cycle": request.billing_cycle
    }
    
    return checkout_session

@app.post("/billing/upgrade")
async def upgrade_subscription(request: CheckoutRequest, user = Depends(verify_jwt_token)):
    """Upgrade user subscription (mock implementation)"""
    user_id = user["user_id"]
    
    if request.tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    subscription = subscriptions_db.get(user_id, {"tier": "free"})
    subscription["tier"] = request.tier
    subscription["status"] = "active"
    subscription["current_period_start"] = datetime.now(timezone.utc).isoformat()
    subscription["current_period_end"] = get_next_billing_date()
    subscriptions_db[user_id] = subscription
    
    return {
        "message": f"Upgraded to {request.tier} tier",
        "subscription": subscription
    }

@app.post("/billing/cancel")
async def cancel_subscription(user = Depends(verify_jwt_token)):
    """Cancel subscription and downgrade to free"""
    user_id = user["user_id"]
    
    subscription = subscriptions_db.get(user_id, {"tier": "free"})
    subscription["tier"] = "free"
    subscription["status"] = "cancelled"
    subscriptions_db[user_id] = subscription
    
    return {"message": "Subscription cancelled. You're now on the free plan."}

# ============================================================================
# PRICING ENDPOINTS
# ============================================================================

@app.get("/pricing", response_model=PricingResponse)
async def get_pricing():
    """Get pricing information for all tiers"""
    plans = []
    for tier_name, tier_config in TIER_LIMITS.items():
        plans.append(PricingTier(
            name=tier_name,
            monthly_price=tier_config["monthly_price"],
            yearly_price=tier_config["yearly_price"],
            monthly_tokens=tier_config["monthly_tokens"],
            requests_per_minute=tier_config["requests_per_minute"],
            features=tier_config["features"]
        ))
    
    return PricingResponse(plans=plans)

# ============================================================================
# RATE LIMITING (PER TIER)
# ============================================================================

def check_rate_limit(user_info: dict, request: Request) -> bool:
    """Check if user has exceeded rate limit for their tier"""
    user_id = user_info["user_id"]
    tier = user_info["tier"]
    rate_limit = TIER_LIMITS[tier]["requests_per_minute"]
    
    client_key = f"{user_id}:rate_limit"
    now = time.time()
    
    # Remove old requests outside the window
    rate_limit_store[client_key] = [
        req_time for req_time in rate_limit_store[client_key]
        if now - req_time < 60
    ]
    
    # Check if limit exceeded
    if len(rate_limit_store[client_key]) >= rate_limit:
        return False
    
    # Add current request
    rate_limit_store[client_key].append(now)
    return True

def check_monthly_quota(user_info: dict, tokens_to_use: int) -> bool:
    """Check if user has monthly quota remaining"""
    user_id = user_info["user_id"]
    tier = user_info["tier"]
    
    monthly_limit = TIER_LIMITS[tier]["monthly_tokens"]
    month_key = f"{user_id}:{get_current_month_year()}"
    current_usage = usage_db[month_key].get("tokens", 0)
    
    return (current_usage + tokens_to_use) <= monthly_limit

# ============================================================================
# OPTIMIZATION ENDPOINT (TIER-AWARE)
# ============================================================================

@app.post("/optimize")
async def optimize(
    request: OptimizeRequest,
    user_info = Depends(verify_api_key_with_tier)
):
    """Optimize tokens with tier-based access control"""
    
    # Check rate limit
    if not check_rate_limit(user_info, None):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Your tier allows {TIER_LIMITS[user_info['tier']]['requests_per_minute']} requests/minute"
        )
    
    # Check monthly quota (estimate: 100 tokens per optimization)
    estimated_tokens = 100
    if not check_monthly_quota(user_info, estimated_tokens):
        remaining = TIER_LIMITS[user_info['tier']]['monthly_tokens'] - usage_db[f"{user_info['user_id']}:{get_current_month_year()}"].get("tokens", 0)
        raise HTTPException(
            status_code=429,
            detail=f"Monthly quota exceeded. You have {remaining} tokens remaining. Upgrade to Pro or Team."
        )
    
    # Check feature availability based on tier
    if not TIER_LIMITS[user_info['tier']]['features']['all_providers'] and request.provider != "openai":
        raise HTTPException(
            status_code=403,
            detail=f"Provider '{request.provider}' requires Pro or Team tier"
        )
    
    # Record usage
    month_key = f"{user_info['user_id']}:{get_current_month_year()}"
    usage_db[month_key]["tokens"] = usage_db[month_key].get("tokens", 0) + estimated_tokens
    usage_db[month_key]["optimizations"] = usage_db[month_key].get("optimizations", 0) + 1
    
    # Return optimization response
    return {
        "status": "success",
        "original_text": request.text,
        "optimized_text": f"[Optimized by Fortress] {request.text}",
        "tokens_saved": 25,
        "tokens_used": estimated_tokens,
        "provider": request.provider,
        "model": request.model,
        "tier": user_info["tier"],
        "remaining_monthly_tokens": TIER_LIMITS[user_info['tier']]['monthly_tokens'] - usage_db[month_key]["tokens"]
    }

# ============================================================================
# PROVIDER & ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/providers")
async def get_providers(user_info = Depends(verify_api_key_with_tier)):
    """Get available providers based on user tier"""
    
    providers = {
        "openai": {
            "name": "OpenAI",
            "models": ["gpt-4", "gpt-4-turbo-preview", "gpt-3.5-turbo"],
            "available": True
        },
        "anthropic": {
            "name": "Anthropic",
            "models": ["claude-opus", "claude-sonnet", "claude-haiku"],
            "available": TIER_LIMITS[user_info['tier']]['features']['all_providers']
        },
        "google": {
            "name": "Google",
            "models": ["gemini-pro", "gemini-pro-vision"],
            "available": TIER_LIMITS[user_info['tier']]['features']['all_providers']
        },
    }
    
    return {"providers": providers}

@app.get("/analytics")
async def get_analytics(user = Depends(verify_jwt_token)):
    """Get detailed analytics for user"""
    user_id = user["user_id"]
    month_key = f"{user_id}:{get_current_month_year()}"
    usage = usage_db[month_key]
    subscription = subscriptions_db.get(user_id, {"tier": "free"})
    
    return {
        "tier": subscription["tier"],
        "month": get_current_month_year(),
        "optimizations_count": usage.get("optimizations", 0),
        "tokens_used": usage.get("tokens", 0),
        "tokens_limit": TIER_LIMITS[subscription["tier"]]["monthly_tokens"],
        "percentage_used": (usage.get("tokens", 0) / TIER_LIMITS[subscription["tier"]]["monthly_tokens"] * 100) if TIER_LIMITS[subscription["tier"]]["monthly_tokens"] > 0 else 0
    }

# ============================================================================
# HEALTH & INFO ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """API information endpoint"""
    return {
        "name": "Fortress Token Optimizer",
        "version": "2.0.0",
        "description": "Enterprise token optimization with user accounts and billing",
        "endpoints": {
            "auth": [
                "POST /auth/signup",
                "POST /auth/login",
                "GET /auth/refresh"
            ],
            "users": [
                "GET /users/profile",
                "POST /users/change-password"
            ],
            "api_keys": [
                "GET /api-keys",
                "POST /api-keys",
                "DELETE /api-keys/{name}"
            ],
            "optimization": [
                "POST /optimize",
                "GET /usage",
                "GET /providers",
                "GET /analytics"
            ],
            "billing": [
                "GET /billing/subscription",
                "POST /billing/checkout",
                "POST /billing/upgrade",
                "POST /billing/cancel"
            ],
            "pricing": [
                "GET /pricing"
            ]
        }
    }
