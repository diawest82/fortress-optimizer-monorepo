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

# ============================================================================
# SAVINGS BAND CONFIGURATION (Extensible for future features)
# ============================================================================
# Base savings percentages by tier - can be enhanced with new features
SAVINGS_BANDS = {
    "base": {
        "name": "Base Token Optimization",
        "description": "Core prompt compression and optimization",
        "savings_percent": 20,
        "enabled": True,
        "introduced": "2.0.0",
    },
    "intelligent_chunking": {
        "name": "Intelligent Chunking",
        "description": "Smart context fragmentation for large documents",
        "savings_percent": 5,
        "enabled": False,  # Future feature
        "introduced": "2.1.0",
    },
    "cache_optimization": {
        "name": "Cache-Aware Optimization",
        "description": "KV-cache aware token reduction",
        "savings_percent": 8,
        "enabled": False,  # Future feature
        "introduced": "2.2.0",
    },
    "semantic_compression": {
        "name": "Semantic Compression",
        "description": "AI-driven semantic deduplication",
        "savings_percent": 12,
        "enabled": False,  # Future feature
        "introduced": "2.3.0",
    }
}

# Tier-specific savings multipliers (how much of each feature is available per tier)
TIER_SAVINGS_MULTIPLIERS = {
    "free": {
        "base": 1.0,  # Full base savings
        "intelligent_chunking": 0.0,  # Not available
        "cache_optimization": 0.0,  # Not available
        "semantic_compression": 0.0,  # Not available
    },
    "pro": {
        "base": 1.0,  # Full base savings
        "intelligent_chunking": 1.0,  # Full (when enabled)
        "cache_optimization": 1.0,  # Full (when enabled)
        "semantic_compression": 0.5,  # 50% (limited to pro)
    },
    "team": {
        "base": 1.0,  # Full base savings
        "intelligent_chunking": 1.0,  # Full (when enabled)
        "cache_optimization": 1.0,  # Full (when enabled)
        "semantic_compression": 1.0,  # Full (when enabled)
    }
}

# Tier configuration
TIER_LIMITS = {
    "free": {
        "monthly_tokens": 50000,
        "monthly_price": 0,
        "yearly_price": 0,
        "requests_per_minute": 10,
        "max_savings_percent": 20,  # Maximum possible savings
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
        "max_savings_percent": 45,  # Can stack multiple features
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
        "max_savings_percent": 50,  # Maximum possible stacked savings
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
        weak_passwords = ['password', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'welcome']
        if v.lower() in weak_passwords:
            raise ValueError('Password too common. Please choose a stronger password')
        if len(set(v)) == 1:
            raise ValueError('Password cannot use the same character repeated')
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        if not (has_letter and (has_number or has_special)):
            raise ValueError('Password must contain letters and numbers or special characters')
        return v

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    api_key: Optional[str] = None
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
    max_savings_percent: float

class SavingsBand(BaseModel):
    """Individual savings feature/band configuration"""
    id: str
    name: str
    description: str
    savings_percent: float
    enabled: bool
    introduced: str

class SavingsBandResponse(BaseModel):
    """Response containing all available savings bands and tier access"""
    available_bands: List[SavingsBand]
    tier: str
    maximum_savings_percent: float
    current_savings_percent: float
    tier_multipliers: Dict[str, float]
    stacking_info: str

class TierSavingsInfo(BaseModel):
    """Information about savings available for a specific tier"""
    tier: str
    base_savings_percent: float
    max_possible_savings_percent: float
    available_features: List[str]
    disabled_features: List[str]

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
    try:
        print(f"\n=== VERIFY_API_KEY_WITH_TIER START ===")
        
        if not authorization:
            print("STEP 1 FAIL: No authorization header")
            raise HTTPException(status_code=403, detail="Missing API key")
        
        print(f"STEP 1: Got authorization header")
        
        # Extract key from "Bearer sk_..." format
        if authorization.startswith("Bearer "):
            api_key = authorization[7:]
        else:
            api_key = authorization
        
        print(f"STEP 2: Extracted API key: {api_key[:20]}...")
        
        # Hash and look up in API keys DB
        try:
            api_key_hash = hash_api_key(api_key)
            print(f"STEP 3: Computed hash: {api_key_hash}")
        except Exception as e:
            print(f"STEP 3 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            if api_key_hash not in api_keys_db:
                print(f"STEP 4 FAIL: Hash not in DB. Available: {list(api_keys_db.keys())}")
                raise HTTPException(status_code=403, detail="Invalid API key")
            print(f"STEP 4: Hash found in DB ({len(api_keys_db)} keys)")
        except HTTPException:
            raise
        except Exception as e:
            print(f"STEP 4 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            api_key_record = api_keys_db[api_key_hash]
            print(f"STEP 5: Got API key record")
        except Exception as e:
            print(f"STEP 5 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            user_id = api_key_record["user_id"]
            print(f"STEP 6: Extracted user_id: {user_id}")
        except Exception as e:
            print(f"STEP 6 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            if user_id not in users_db:
                print(f"STEP 7 FAIL: User not in DB. Available: {list(users_db.keys())}")
                raise HTTPException(status_code=403, detail="User not found")
            print(f"STEP 7: User found ({len(users_db)} users)")
        except HTTPException:
            raise
        except Exception as e:
            print(f"STEP 7 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            user = users_db[user_id]
            print(f"STEP 8: Retrieved user record")
        except Exception as e:
            print(f"STEP 8 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            subscription = subscriptions_db.get(user_id, {})
            tier = subscription.get("tier", "free")
            print(f"STEP 9: Got subscription (tier={tier})")
        except Exception as e:
            print(f"STEP 9 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            month_key = f"{user_id}:{get_current_month_year()}"
            print(f"STEP 10: Created month_key: {month_key}")
        except Exception as e:
            print(f"STEP 10 ERROR: {type(e).__name__}: {e}")
            raise
        
        try:
            usage = usage_db[month_key]
            print(f"STEP 11: Got usage data")
        except Exception as e:
            print(f"STEP 11 ERROR: {type(e).__name__}: {e}")
            raise
        
        result = {
            "user_id": user_id,
            "email": user["email"],
            "tier": tier,
            "usage": usage,
            "api_key": api_key
        }
        print(f"✓ All steps complete. Returning user_info")
        print(f"=== VERIFY_API_KEY_WITH_TIER SUCCESS ===\n")
        return result
        
    except HTTPException as e:
        print(f"✗ HTTPException: {e.detail}")
        print(f"=== VERIFY_API_KEY_WITH_TIER FAILED ===\n")
        raise
    except Exception as e:
        print(f"✗ Unexpected error: {type(e).__name__}: {e}")
        print(f"=== VERIFY_API_KEY_WITH_TIER ERROR ===\n")
        raise HTTPException(status_code=403, detail="Invalid API key") from e

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

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Get current user from JWT or API key"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    # Try JWT first
    if authorization.startswith("Bearer "):
        try:
            return verify_jwt_token(authorization)
        except:
            pass
    
    # Try API key
    try:
        return verify_api_key_with_tier(authorization)
    except:
        raise HTTPException(status_code=401, detail="Invalid authorization")

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
    
    print(f"\n=== SIGNUP DEBUG ===")
    print(f"Generated API key: {api_key}")
    print(f"API key hash: {api_key_hash}")
    print(f"Total keys in DB after signup: {len(api_keys_db)}")
    print(f"API keys DB contents: {list(api_keys_db.keys())}")
    print(f"=== END DEBUG ===\n")
    
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
    
    token = generate_jwt(user_id)
    
    token = generate_jwt(user_id)
    
    # Note: We do NOT regenerate API keys on login - the client should use their existing key
    # or request a new one from the /api-keys endpoint
    # Return None for API key since we don't expose the raw key after login
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user_id,
            "email": user["email"],
            "tier": subscription.get("tier", "free")
        },
        api_key=None,
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
    print(f"\n=== GET_USAGE ENDPOINT ===")
    print(f"user_info received: {user_info}")
    print(f"=== END GET_USAGE ===\n")
    
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

@app.get("/pricing")
async def get_pricing():
    """Get pricing information for all tiers"""
    pricing_data = {}
    for tier_name, tier_config in TIER_LIMITS.items():
        pricing_data[tier_name] = {
            "name": tier_name,
            "monthly_price": tier_config["monthly_price"],
            "yearly_price": tier_config["yearly_price"],
            "monthly_tokens": tier_config["monthly_tokens"],
            "requests_per_minute": tier_config["requests_per_minute"],
            "max_savings_percent": tier_config["max_savings_percent"],
            "features": tier_config["features"]
        }
    return pricing_data

# ============================================================================
# SAVINGS BANDS ENDPOINTS (NEW FEATURE MANAGEMENT)
# ============================================================================

@app.get("/savings-bands")
async def get_savings_bands(
    user_info = Depends(verify_api_key_with_tier),
    show_roadmap: bool = Query(False, description="Admin only: show disabled/future features")
):
    """Get available savings bands and tier-specific access information
    
    By default, only shows enabled features.
    Set show_roadmap=true (admin only) to see future features
    """
    user_tier = user_info["tier"]
    
    # Build available bands list - only enabled features by default
    available_bands = []
    for band_id, band_config in SAVINGS_BANDS.items():
        # Skip disabled features unless show_roadmap is true
        if not band_config["enabled"] and not show_roadmap:
            continue
            
        available_bands.append(SavingsBand(
            id=band_id,
            name=band_config["name"],
            description=band_config["description"],
            savings_percent=band_config["savings_percent"],
            enabled=band_config["enabled"],
            introduced=band_config["introduced"]
        ))
    
    # Calculate current maximum savings for this tier
    max_savings = calculate_max_savings_for_tier(user_tier)
    current_savings = calculate_current_savings_for_tier(user_tier)
    
    return SavingsBandResponse(
        available_bands=available_bands,
        tier=user_tier,
        maximum_savings_percent=max_savings,
        current_savings_percent=current_savings,
        tier_multipliers=TIER_SAVINGS_MULTIPLIERS[user_tier],
        stacking_info=f"Your {user_tier} tier can stack up to {max_savings}% in savings from available features."
    )

@app.get("/savings-bands/tier/{tier_name}")
async def get_tier_savings_info(
    tier_name: str,
    show_roadmap: bool = Query(False, description="Admin only: show disabled/future features")
):
    """Get savings band information for a specific tier
    
    By default, only shows enabled features.
    Set show_roadmap=true (admin only) to see future features
    """
    if tier_name not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier name")
    
    multipliers = TIER_SAVINGS_MULTIPLIERS[tier_name]
    available_features = [band_id for band_id, mult in multipliers.items() if mult > 0 and SAVINGS_BANDS[band_id]["enabled"]]
    disabled_features = [band_id for band_id, mult in multipliers.items() if mult == 0 and SAVINGS_BANDS[band_id]["enabled"]] if show_roadmap else []
    
    max_savings = TIER_LIMITS[tier_name]["max_savings_percent"]
    
    return TierSavingsInfo(
        tier=tier_name,
        base_savings_percent=SAVINGS_BANDS["base"]["savings_percent"],
        max_possible_savings_percent=max_savings,
        available_features=available_features,
        disabled_features=disabled_features
    )

@app.get("/savings-bands/status")
async def get_savings_status(
    user_info = Depends(verify_api_key_with_tier),
    show_roadmap: bool = Query(False, description="Admin only: show disabled/future features")
):
    """Get current savings status for authenticated user
    
    By default, only shows enabled features.
    Set show_roadmap=true (admin only) to see future features
    """
    user_tier = user_info["tier"]
    
    result = {
        "tier": user_tier,
        "base_savings_percent": SAVINGS_BANDS["base"]["savings_percent"],
        "max_possible_savings": TIER_LIMITS[user_tier]["max_savings_percent"],
        "active_features": [],
        "available_features": [],
        "locked_features": []
    }
    
    multipliers = TIER_SAVINGS_MULTIPLIERS[user_tier]
    for band_id, band_config in SAVINGS_BANDS.items():
        multiplier = multipliers.get(band_id, 0)
        
        if band_config["enabled"]:
            if multiplier > 0:
                result["active_features"].append({
                    "id": band_id,
                    "name": band_config["name"],
                    "savings_percent": band_config["savings_percent"] * multiplier,
                    "access_level": f"{int(multiplier * 100)}%"
                })
            else:
                result["locked_features"].append({
                    "id": band_id,
                    "name": band_config["name"],
                    "savings_percent": band_config["savings_percent"],
                    "reason": f"Available in higher tiers"
                })
        else:
            # Only show future features if show_roadmap is true
            if show_roadmap:
                result["available_features"].append({
                    "id": band_id,
                    "name": band_config["name"],
                    "savings_percent": band_config["savings_percent"],
                    "status": "coming_soon",
                    "introduced": band_config["introduced"]
                })
    
    return result

# ============================================================================
# HELPER FUNCTIONS FOR SAVINGS CALCULATION
# ============================================================================

def calculate_max_savings_for_tier(tier: str) -> float:
    """Calculate maximum possible savings for a tier by stacking available features"""
    if tier not in TIER_SAVINGS_MULTIPLIERS:
        return 0
    
    multipliers = TIER_SAVINGS_MULTIPLIERS[tier]
    total_savings = 0
    
    for band_id, band_config in SAVINGS_BANDS.items():
        if band_config["enabled"]:
            multiplier = multipliers.get(band_id, 0)
            total_savings += band_config["savings_percent"] * multiplier
    
    # Cap at tier maximum
    max_allowed = TIER_LIMITS[tier]["max_savings_percent"]
    return min(total_savings, max_allowed)

def calculate_current_savings_for_tier(tier: str) -> float:
    """Calculate current savings for a tier (only enabled features)"""
    if tier not in TIER_SAVINGS_MULTIPLIERS:
        return 0
    
    multipliers = TIER_SAVINGS_MULTIPLIERS[tier]
    total_savings = 0
    
    for band_id, band_config in SAVINGS_BANDS.items():
        if band_config["enabled"]:
            multiplier = multipliers.get(band_id, 0)
            total_savings += band_config["savings_percent"] * multiplier
    
    # Cap at tier maximum
    max_allowed = TIER_LIMITS[tier]["max_savings_percent"]
    return min(total_savings, max_allowed)

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
# PROVIDER INTELLIGENCE ENDPOINTS (NEW FEATURES)
# ============================================================================

# Import new modules
import sys
sys.path.insert(0, '/Users/diawest/projects/fortress-optimizer-monorepo/backend')

try:
    from provider_intelligence import get_provider_intelligence
    from cost_predictor import get_cost_predictor
    print("✅ Provider intelligence and cost predictor modules loaded")
except ImportError as e:
    print(f"⚠️ Could not load ML modules: {e}")
    get_provider_intelligence = None
    get_cost_predictor = None

class ProviderRecommendationRequest(BaseModel):
    """Request for provider recommendations"""
    text: str
    user_preferences: Optional[Dict] = {
        "priority": "cost",  # cost, speed, quality
        "budget_limit": 1.0
    }

@app.post("/api/provider-recommendations")
async def get_provider_recommendations(
    request: ProviderRecommendationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Get provider recommendations for text optimization.
    
    Patent: Adaptive provider intelligence system
    
    Analyzes text and recommends providers based on:
    - Cost per token
    - Speed ranking
    - Quality ranking
    - User preferences
    """
    if not get_provider_intelligence:
        raise HTTPException(status_code=503, detail="Provider intelligence not available")
    
    engine = get_provider_intelligence()
    
    try:
        recommendations = engine.get_provider_recommendations(
            request.text,
            request.user_preferences
        )
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": current_user["user_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/cost-prediction")
async def get_cost_prediction(
    current_user: dict = Depends(get_current_user)
):
    """
    Get cost prediction and recommendations.
    
    Patent: Machine learning-based cost prediction
    
    Returns:
    - Projected monthly cost
    - Daily average spending
    - Anomalies detected
    - Cost reduction recommendations
    """
    if not get_cost_predictor:
        raise HTTPException(status_code=503, detail="Cost predictor not available")
    
    predictor = get_cost_predictor()
    user_id = current_user["user_id"]
    
    try:
        prediction = predictor.predict_monthly_cost(user_id)
        anomalies = predictor.detect_anomalies(user_id, lookback_days=7)
        recommendations = predictor.recommend_cost_reduction(user_id)
        efficiency = predictor.get_efficiency_score(user_id)
        
        return {
            "status": "success",
            "prediction": {
                "daily_average": prediction.daily_average,
                "current_period_cost": prediction.current_period_cost,
                "projected_period_end": prediction.projected_period_end,
                "days_remaining": prediction.days_remaining,
                "confidence": prediction.confidence,
                "trend": prediction.trend
            },
            "anomalies": [
                {
                    "date": a.date,
                    "type": a.type,
                    "normal_cost": a.normal_cost,
                    "actual_cost": a.actual_cost,
                    "severity": a.severity,
                    "message": a.message
                }
                for a in anomalies
            ],
            "recommendations": recommendations,
            "efficiency_score": efficiency,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
