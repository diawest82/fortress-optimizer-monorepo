"""
Fortress Token Optimizer - FastAPI Backend
Main API application with optimization, auth, and metrics endpoints
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List, Dict
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy.orm import Session
import hashlib
import logging
import os
import time
import uuid

# Import core optimization algorithm (backend-only)
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))  # For Docker flat layout
from shared_libs.core import TokenOptimizer, OptimizationResult
from shared_libs.fortress_types import (
    OPTIMIZATION_LEVELS,
    PROVIDERS,
    PRICING_TIERS,
)
from database import get_db, init_db, engine, Base
from models import ApiKey, OptimizationLog
from cleanup import run_cleanup
from extension_routes import router as extension_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# API Key Hashing
# ============================================================================

API_KEY_SECRET = os.getenv("API_KEY_SECRET", "fortress-dev-secret-change-in-prod")


def _hash_key(key: str) -> str:
    """Hash an API key for storage/comparison"""
    return hashlib.sha256(f"{API_KEY_SECRET}:{key}".encode()).hexdigest()


# ============================================================================
# Rate Limiter (in-memory — ephemeral by design, resets are safe)
# ============================================================================


class RateLimiter:
    """Sliding-window rate limiter using in-memory counters"""

    def __init__(self, requests_per_minute: int = 100, requests_per_day: int = 10000):
        self.rpm = requests_per_minute
        self.rpd = requests_per_day
        self._minute_buckets: Dict[str, list] = defaultdict(list)
        self._day_buckets: Dict[str, list] = defaultdict(list)

    def is_allowed(self, key_hash: str) -> bool:
        now = time.time()
        minute_ago = now - 60
        day_ago = now - 86400

        # Clean old entries
        self._minute_buckets[key_hash] = [
            t for t in self._minute_buckets[key_hash] if t > minute_ago
        ]
        self._day_buckets[key_hash] = [
            t for t in self._day_buckets[key_hash] if t > day_ago
        ]

        if len(self._minute_buckets[key_hash]) >= self.rpm:
            return False
        if len(self._day_buckets[key_hash]) >= self.rpd:
            return False

        self._minute_buckets[key_hash].append(now)
        self._day_buckets[key_hash].append(now)
        return True

    def get_usage(self, key_hash: str) -> dict:
        now = time.time()
        minute_ago = now - 60
        day_ago = now - 86400
        rpm_used = len([t for t in self._minute_buckets.get(key_hash, []) if t > minute_ago])
        rpd_used = len([t for t in self._day_buckets.get(key_hash, []) if t > day_ago])
        return {
            "requests_this_minute": rpm_used,
            "requests_this_day": rpd_used,
            "rpm_limit": self.rpm,
            "rpd_limit": self.rpd,
        }

    def get_headers(self, key_hash: str) -> dict:
        usage = self.get_usage(key_hash)
        return {
            "X-RateLimit-Limit": str(self.rpm),
            "X-RateLimit-Remaining": str(max(0, self.rpm - usage["requests_this_minute"])),
            "X-RateLimit-Reset": str(int(time.time()) + 60),
        }


_redis_url = os.getenv("REDIS_URL")
if _redis_url:
    from rate_limiter_redis import RedisRateLimiter
    rate_limiter = RedisRateLimiter(redis_url=_redis_url)
else:
    rate_limiter = RateLimiter(requests_per_minute=100, requests_per_day=10000)

# ============================================================================
# Initialize FastAPI app
# ============================================================================

_is_production = os.getenv("FORTRESS_ENV", os.getenv("ENVIRONMENT", "development")) == "production"

app = FastAPI(
    title="Fortress Token Optimizer API",
    description="Backend API for token optimization (IP Protected)",
    version="1.5.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# Add CORS middleware — production domains only in production
CORS_ORIGINS = [
    "https://fortress-optimizer.com",
    "https://www.fortress-optimizer.com",
    "https://app.fortress-optimizer.com",
]
if not _is_production:
    CORS_ORIGINS.extend(["http://localhost:3000", "http://localhost:5173"])

from middleware import RequestIdMiddleware

app.add_middleware(RequestIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Admin-Secret"],
    max_age=600,
)

# Extension routes are stubbed — only mount in development
if not _is_production:
    app.include_router(extension_router)


# ============================================================================
# Request/Response Models
# ============================================================================


class OptimizeRequest(BaseModel):
    """Request to optimize a prompt"""

    prompt: str = Field(..., min_length=1, max_length=50000)
    level: Literal["conservative", "balanced", "aggressive"] = "balanced"
    provider: str = Field("openai", description="LLM provider")

    @field_validator("prompt")
    @classmethod
    def reject_null_bytes(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("Prompt must not contain null bytes")
        return v


class OptimizeResponse(BaseModel):
    """Response with optimization results"""

    request_id: str
    status: str
    optimization: Optional[dict] = None
    tokens: Optional[dict] = None
    timestamp: datetime
    technique: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    timestamp: datetime
    version: str
    database: str


class ProvidersResponse(BaseModel):
    """List of supported providers"""

    providers: List[str]
    count: int


class RegisterKeyRequest(BaseModel):
    """Request to register a new API key"""

    name: str = Field(..., min_length=1, max_length=100)
    tier: Literal["free"] = "free"  # Only free tier via self-service; paid tiers require Stripe


# ============================================================================
# Authentication (DB-backed)
# ============================================================================


async def verify_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> str:
    """Verify API key from Authorization header or X-API-Key header"""
    api_key = None

    # Support both Authorization: Bearer <key> and X-API-Key: <key>
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization[7:]
    elif x_api_key:
        api_key = x_api_key

    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    if len(api_key) < 10:
        raise HTTPException(status_code=401, detail="Invalid API key format")

    # Validate key must start with fk_ prefix
    if not api_key.startswith("fk_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    # Check against database
    key_hash = _hash_key(api_key)
    db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash, ApiKey.is_active == True).first()

    if not db_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check rate limit (still in-memory — ephemeral by design)
    if not rate_limiter.is_allowed(key_hash):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Max 100 requests/minute, 10000/day.",
        )

    return api_key


# ============================================================================
# Endpoints
# ============================================================================


@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint (public, no auth)"""
    # Quick DB connectivity check
    db_status = "connected"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    status = "healthy" if db_status == "connected" else "degraded"
    status_code = 200 if db_status == "connected" else 503

    response_data = HealthResponse(
        status=status,
        timestamp=datetime.utcnow(),
        version="1.5.0",
        database=db_status,
    )

    if status_code != 200:
        return JSONResponse(
            status_code=status_code,
            content={
                "status": response_data.status,
                "timestamp": response_data.timestamp.isoformat(),
                "version": response_data.version,
                "database": response_data.database,
            },
        )
    return response_data


@app.get("/api/providers", response_model=ProvidersResponse)
async def get_providers(api_key: str = Depends(verify_api_key)):
    """Get list of supported LLM providers"""
    return ProvidersResponse(
        providers=PROVIDERS,
        count=len(PROVIDERS),
    )


@app.post("/api/optimize", response_model=OptimizeResponse)
async def optimize(
    request: OptimizeRequest,
    req: Request,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """
    Optimize a prompt for token efficiency.

    Runs the proprietary optimization algorithm (BACKEND ONLY).
    Never exposes algorithm details to the client.
    """
    try:
        # Enforce free tier token limit (with monthly reset)
        key_hash = _hash_key(api_key)
        db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
        if db_key:
            # Reset monthly counter if a new month has started
            now = datetime.utcnow()
            if db_key.monthly_reset_at is None or now.month != db_key.monthly_reset_at.month or now.year != db_key.monthly_reset_at.year:
                db_key.monthly_tokens_used = 0
                db_key.monthly_reset_at = now
                db.commit()

            tier_config = PRICING_TIERS.get(db_key.tier, PRICING_TIERS["free"])
            if not tier_config.get("unlimited") and db_key.monthly_tokens_used >= tier_config["tokens_per_month"]:
                raise HTTPException(
                    status_code=429,
                    detail=f"Free tier limit of {tier_config['tokens_per_month']} tokens/month exceeded. Upgrade to Pro for unlimited.",
                )

        request_id = f"opt_{uuid.uuid4().hex[:12]}"

        # Run optimization
        optimizer = TokenOptimizer(provider=request.provider)
        result: OptimizationResult = optimizer.optimize(
            prompt=request.prompt,
            level=request.level,
            context_window=8000,
        )

        # Persist usage to database (db_key already fetched above)
        if db_key:
            db_key.tokens_optimized += result.original_tokens
            db_key.tokens_saved += result.savings
            db_key.monthly_tokens_used += result.original_tokens
            db_key.requests += 1
            db_key.last_used_at = datetime.utcnow()
            if not db_key.first_used_at:
                db_key.first_used_at = datetime.utcnow()

        # Write audit log
        log_entry = OptimizationLog(
            request_id=request_id,
            key_hash=key_hash,
            original_tokens=result.original_tokens,
            optimized_tokens=result.optimized_tokens,
            savings=result.savings,
            savings_percentage=round(result.savings_percentage, 2),
            technique=result.technique_used,
            level=request.level,
            provider=request.provider,
        )
        db.add(log_entry)
        db.commit()

        logger.info(
            f"Optimization [{request_id}]: {result.savings} tokens saved "
            f"({result.savings_percentage:.1f}%) via {result.technique_used}"
        )

        response_data = OptimizeResponse(
            request_id=request_id,
            status="success",
            optimization={
                "optimized_prompt": result.optimized_prompt,
                "technique": result.technique_used,
            },
            tokens={
                "original": result.original_tokens,
                "optimized": result.optimized_tokens,
                "savings": result.savings,
                "savings_percentage": round(result.savings_percentage, 2),
            },
            timestamp=datetime.utcnow(),
            technique=result.technique_used,
        )

        # Add rate limit headers
        rl_headers = rate_limiter.get_headers(key_hash)
        return JSONResponse(
            content=jsonable_encoder(response_data),
            headers=rl_headers,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/usage")
async def get_usage(
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Get token usage statistics for the authenticated API key"""
    key_hash = _hash_key(api_key)
    db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()

    if not db_key:
        raise HTTPException(status_code=404, detail="Key not found")

    rate_info = rate_limiter.get_usage(key_hash)
    tier = db_key.tier
    tier_config = PRICING_TIERS.get(tier, PRICING_TIERS["free"])
    token_limit = tier_config["tokens_per_month"]
    is_unlimited = tier_config.get("unlimited", False)

    return {
        "tier": tier,
        "tokens_optimized": db_key.tokens_optimized,
        "tokens_saved": db_key.tokens_saved,
        "requests": db_key.requests,
        "tokens_limit": "unlimited" if is_unlimited else token_limit,
        "tokens_remaining": "unlimited" if is_unlimited else max(0, token_limit - db_key.tokens_optimized),
        "rate_limit": rate_info,
        "reset_date": (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat(),
    }


@app.get("/api/pricing")
async def get_pricing():
    """Get pricing information (public endpoint, no auth)"""
    return {
        "tiers": {
            "free": {
                "tokens_per_month": 50000,
                "price_monthly": 0,
                "max_seats": 1,
                "features": ["50K tokens/month", "5 core integration channels", "Basic metrics dashboard", "Community support"],
            },
            "pro": {
                "tokens_per_month": "unlimited",
                "price_monthly": 9.99,
                "max_seats": 1,
                "features": ["Unlimited tokens", "All 12 integration platforms", "Advanced analytics", "API access", "Email support"],
            },
            "team": {
                "tokens_per_month": "unlimited",
                "price_monthly": "sliding_scale",
                "max_seats": 500,
                "pricing_scale": {
                    "1-5": {"base": 49, "per_seat": 9.80},
                    "6-25": {"per_seat": 8.00},
                    "26-100": {"per_seat": 6.00},
                    "101-249": {"per_seat": 5.00},
                    "250-500": {"per_seat": 4.00},
                },
                "features": [
                    "Unlimited tokens for every seat",
                    "Team management & RBAC",
                    "All 12 integration platforms",
                    "Advanced analytics & team usage tracking",
                    "Priority support (4-8h response)",
                    "Slack integration",
                    "Admin dashboard",
                    "Higher rate limits",
                ],
            },
            "enterprise": {
                "tokens_per_month": "unlimited",
                "price_monthly": "custom",
                "max_seats": "unlimited",
                "features": [
                    "Everything in Teams",
                    "500+ team seats",
                    "Dedicated account manager",
                    "Custom SLA",
                    "Custom integrations",
                    "On-premise deployment option",
                ],
            },
        },
        "currency": "USD",
        "billing_cycle": "monthly",
    }


# Simple IP-based rate limit for key registration (max 5 per hour per IP)
_registration_tracker: Dict[str, list] = defaultdict(list)


@app.post("/api/keys/register")
async def register_api_key(
    request: RegisterKeyRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    """Register a new API key (self-service)"""
    # Rate limit: max 5 registrations per hour per IP
    client_ip = req.client.host if req.client else "unknown"
    now = time.time()
    hour_ago = now - 3600
    _registration_tracker[client_ip] = [
        t for t in _registration_tracker[client_ip] if t > hour_ago
    ]
    if len(_registration_tracker[client_ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many key registrations. Max 5 per hour.",
        )
    _registration_tracker[client_ip].append(now)

    new_key = f"fk_{uuid.uuid4().hex}"
    key_hash = _hash_key(new_key)

    db_key = ApiKey(
        key_hash=key_hash,
        name=request.name,
        tier=request.tier,
    )
    db.add(db_key)
    db.commit()

    logger.info(f"New API key registered: {new_key[:12]}... (name={request.name}, tier={request.tier})")

    return {
        "api_key": new_key,
        "tier": request.tier,
        "name": request.name,
        "rate_limits": {
            "requests_per_minute": 100,
            "requests_per_day": 10000,
        },
    }


@app.post("/api/keys/rotate")
async def rotate_api_key(
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Rotate an API key: generates a new key, invalidates the old one"""
    old_hash = _hash_key(api_key)
    db_key = db.query(ApiKey).filter(ApiKey.key_hash == old_hash).first()

    if not db_key:
        raise HTTPException(status_code=404, detail="Key not found")

    # Generate new key and update hash in-place (preserves all other fields)
    new_key = f"fk_{uuid.uuid4().hex}"
    db_key.key_hash = _hash_key(new_key)
    db.commit()

    logger.info(f"API key rotated: {api_key[:12]}... -> {new_key[:12]}... (name={db_key.name})")

    return {
        "api_key": new_key,
        "message": "Key rotated. Old key is now invalid.",
    }


@app.delete("/api/keys")
async def deactivate_api_key(
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Deactivate an API key"""
    key_hash = _hash_key(api_key)
    db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()

    if not db_key:
        raise HTTPException(status_code=404, detail="Key not found")

    db_key.is_active = False
    db.commit()

    logger.info(f"API key deactivated: {api_key[:12]}... (name={db_key.name})")

    return {"message": "API key deactivated"}


# ============================================================================
# Admin Endpoints
# ============================================================================

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


@app.post("/api/admin/cleanup")
async def admin_cleanup(
    x_admin_secret: Optional[str] = Header(None),
):
    """Run database cleanup (admin only)."""
    if not ADMIN_SECRET or x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = run_cleanup()
    return {"status": "success", **result}


# ============================================================================
# Error Handlers
# ============================================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": exc.detail,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": "Internal server error",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# ============================================================================
# Startup/Shutdown
# ============================================================================


def _validate_production_env():
    """Validate required environment variables in production mode."""
    env = os.getenv("FORTRESS_ENV", "development")
    if env != "production":
        return  # No validation in dev mode

    missing = []
    if not os.getenv("DATABASE_URL"):
        missing.append("DATABASE_URL")

    api_secret = os.getenv("API_KEY_SECRET", "")
    if not api_secret:
        missing.append("API_KEY_SECRET")
    elif api_secret == "fortress-dev-secret-change-in-prod":
        raise RuntimeError(
            "API_KEY_SECRET is set to the dev default — "
            "set a real secret in production"
        )

    if missing:
        raise RuntimeError(
            f"Missing required environment variables for production: {', '.join(missing)}"
        )


def _seed_dev_keys(db: Session):
    """Seed development API keys if they don't exist yet."""
    env_key = os.getenv("FORTRESS_DEV_API_KEY")
    if not env_key:
        return

    key_hash = _hash_key(env_key)
    existing = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
    if not existing:
        db_key = ApiKey(
            key_hash=key_hash,
            name="env-dev-key",
            tier="pro",
        )
        db.add(db_key)
        db.commit()
        logger.info(f"Dev API key seeded: {env_key[:12]}...")
    else:
        logger.info(f"Dev API key already exists: {env_key[:12]}...")


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Fortress Token Optimizer API v1.2.0")

    # Validate production environment
    if _is_production:
        _validate_production_env()

    # Create tables (IF NOT EXISTS — safe to call repeatedly)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")

    # Seed dev keys
    db = next(get_db())
    try:
        _seed_dev_keys(db)
    finally:
        db.close()

    logger.info(f"CORS origins: {CORS_ORIGINS}")
    logger.info(f"Rate limits: {rate_limiter.rpm} req/min, {rate_limiter.rpd} req/day")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Fortress Token Optimizer API")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
