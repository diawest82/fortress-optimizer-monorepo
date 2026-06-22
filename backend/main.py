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
from datetime import datetime, timedelta, timezone
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
from sqlalchemy import func, case
from sqlalchemy.exc import IntegrityError
from database import get_db, init_db, engine, Base, utcnow
from models import ApiKey, OptimizationLog, UsageEvent
from meter_pricing import estimate_cost_microdollars, PRICING_VERSION
from cleanup import run_cleanup
from extension_routes import router as extension_router

# Configure structured JSON logging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        import json as _json
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, 'request_id'):
            log_entry["request_id"] = record.request_id
        if hasattr(record, 'duration_ms'):
            log_entry["duration_ms"] = record.duration_ms
        if hasattr(record, 'method'):
            log_entry["method"] = record.method
        if hasattr(record, 'path'):
            log_entry["path"] = record.path
        if hasattr(record, 'status_code'):
            log_entry["status_code"] = record.status_code
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = str(record.exc_info[1])
            log_entry["traceback"] = self.formatException(record.exc_info)
        # Include any extra fields
        for key in ('event', 'key_hash', 'tier', 'tokens', 'ip'):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)
        return _json.dumps(log_entry)

_handler = logging.StreamHandler()
_handler.setFormatter(JSONFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)

# ============================================================================
# API Key Hashing
# ============================================================================

API_KEY_SECRET = os.getenv("API_KEY_SECRET", "fortress-dev-secret-change-in-prod")


def _hash_key(key: str) -> str:
    """Hash an API key for storage/comparison"""
    return hashlib.sha256(f"{API_KEY_SECRET}:{key}".encode()).hexdigest()


# ============================================================================
# Key Provisioning (server-to-server; website calls this after OAuth sign-in)
# ============================================================================

# Default test/dev secret. In production PROVISION_SECRET MUST be set or the
# provision endpoint fails closed (503) — see _resolve_provision_secret().
_DEFAULT_PROVISION_SECRET = "fortress-dev-provision-secret"


def _is_production_env() -> bool:
    return os.getenv("FORTRESS_ENV", os.getenv("ENVIRONMENT", "development")) == "production"


def _resolve_provision_secret() -> Optional[str]:
    """Return the expected X-Provision-Secret, or None if misconfigured.

    In production PROVISION_SECRET must be explicitly set; otherwise we return
    None so the endpoint can fail closed with 503. In dev/test a default secret
    is acceptable so the suite and local website can provision keys."""
    secret = os.getenv("PROVISION_SECRET")
    if secret:
        return secret
    if _is_production_env():
        return None
    return _DEFAULT_PROVISION_SECRET


# Global daily ceiling on free-key provisioning (cost control). Counted in
# Redis when REDIS_URL is set, else in-memory. Read lazily so tests can patch
# the env var per-test.
def _max_free_provisions_per_day() -> int:
    try:
        return int(os.getenv("FORTRESS_MAX_FREE_PROVISIONS_PER_DAY", "1000"))
    except (TypeError, ValueError):
        return 1000


# In-memory fallback counter: {"YYYY-MM-DD": count}
_free_provision_counts: Dict[str, int] = defaultdict(int)


def _incr_free_provision_count() -> int:
    """Atomically increment today's free-provision counter and return the new
    total. Uses Redis when REDIS_URL is set (key reg:free:<UTC-date>, TTL
    ~90000s); falls back to an in-memory per-process counter otherwise."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis as _redis
            r = _redis.from_url(redis_url, socket_connect_timeout=2)
            redis_key = f"reg:free:{day}"
            new_total = r.incr(redis_key)
            if new_total == 1:
                r.expire(redis_key, 90000)
            return int(new_total)
        except Exception as e:
            logger.warning(f"Redis unavailable for free-provision counter, using in-memory: {e}")
    _free_provision_counts[day] += 1
    return _free_provision_counts[day]


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
# Key Sharing Detection (Layer 1 — Detection Only)
# ============================================================================

class KeySharingDetector:
    """Tracks unique IPs and User-Agents per API key to detect sharing.
    In-memory for speed — not persistent across restarts (detection, not enforcement).
    """

    def __init__(self):
        # key_hash -> {ips: set, user_agents: set, countries: set, last_reset: timestamp}
        self._tracking: Dict[str, dict] = {}
        self._anomaly_thresholds = {
            "ips_warning": 5,       # 5+ unique IPs in 24h → log warning
            "ips_suspicious": 15,   # 15+ unique IPs → log suspicious
            "user_agents_warning": 4,  # 4+ unique user agents → log warning
        }

    def track_request(self, key_hash: str, ip: str, user_agent: str) -> dict | None:
        """Track a request and return anomaly info if detected."""
        now = time.time()

        if key_hash not in self._tracking:
            self._tracking[key_hash] = {
                "ips": set(),
                "user_agents": set(),
                "first_seen": now,
                "last_reset": now,
                "request_count": 0,
            }

        entry = self._tracking[key_hash]

        # Reset daily
        if now - entry["last_reset"] > 86400:
            entry["ips"] = set()
            entry["user_agents"] = set()
            entry["last_reset"] = now
            entry["request_count"] = 0

        entry["ips"].add(ip)
        entry["user_agents"].add(user_agent[:100])  # truncate UA
        entry["request_count"] += 1

        # Check for anomalies
        unique_ips = len(entry["ips"])
        unique_uas = len(entry["user_agents"])

        if unique_ips >= self._anomaly_thresholds["ips_suspicious"]:
            return {
                "level": "suspicious",
                "reason": "high_ip_diversity",
                "unique_ips": unique_ips,
                "unique_user_agents": unique_uas,
                "requests_today": entry["request_count"],
            }
        elif unique_ips >= self._anomaly_thresholds["ips_warning"]:
            return {
                "level": "warning",
                "reason": "moderate_ip_diversity",
                "unique_ips": unique_ips,
                "unique_user_agents": unique_uas,
                "requests_today": entry["request_count"],
            }
        elif unique_uas >= self._anomaly_thresholds["user_agents_warning"]:
            return {
                "level": "warning",
                "reason": "user_agent_diversity",
                "unique_ips": unique_ips,
                "unique_user_agents": unique_uas,
                "requests_today": entry["request_count"],
            }

        return None

    def get_stats(self, key_hash: str) -> dict:
        """Get sharing detection stats for a key."""
        entry = self._tracking.get(key_hash)
        if not entry:
            return {"unique_ips": 0, "unique_user_agents": 0, "requests_today": 0}
        return {
            "unique_ips": len(entry["ips"]),
            "unique_user_agents": len(entry["user_agents"]),
            "requests_today": entry["request_count"],
        }

    def cleanup_stale(self):
        """Remove entries older than 48 hours."""
        now = time.time()
        stale = [k for k, v in self._tracking.items() if now - v["last_reset"] > 172800]
        for k in stale:
            del self._tracking[k]


key_sharing_detector = KeySharingDetector()


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


class AttributionMeta(BaseModel):
    """Optional cost-attribution metadata for metering."""

    feature: Optional[str] = Field(None, min_length=1, max_length=100)
    customer_id: Optional[str] = Field(None, min_length=1, max_length=100)
    workflow: Optional[str] = Field(None, min_length=1, max_length=100)
    environment: Optional[str] = Field(None, min_length=1, max_length=50)
    tags: Optional[Dict[str, str]] = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v):
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError("tags: maximum 5 entries")
        for k, val in v.items():
            if not (1 <= len(k) <= 40):
                raise ValueError("tags: keys must be 1-40 chars")
            if not (0 <= len(val) <= 100):
                raise ValueError("tags: values must be <= 100 chars")
        return v


class OptimizeRequest(BaseModel):
    """Request to optimize a prompt"""

    prompt: str = Field(..., min_length=1, max_length=50000)
    level: Literal["conservative", "balanced", "aggressive"] = "balanced"
    provider: str = Field("openai", description="LLM provider")
    model: Optional[str] = Field(None, max_length=100)  # for cost estimation
    attribution: Optional[AttributionMeta] = None

    @field_validator("prompt")
    @classmethod
    def reject_null_bytes(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("Prompt must not contain null bytes")
        return v


class CostInfo(BaseModel):
    """Estimated cost for an optimize call (input-token cost)."""

    estimated: bool
    original_cost_usd: Optional[float] = None
    optimized_cost_usd: Optional[float] = None
    savings_usd: Optional[float] = None
    pricing_version: Optional[str] = None


class OptimizeResponse(BaseModel):
    """Response with optimization results"""

    request_id: str
    status: str
    optimization: Optional[dict] = None
    tokens: Optional[dict] = None
    timestamp: datetime
    technique: Optional[str] = None
    cost: Optional[CostInfo] = None  # null when unpriceable or model not given


class TrackUsageRequest(BaseModel):
    """Report LLM usage that did not pass through Fortress optimize."""

    provider: str = Field(..., min_length=1, max_length=50)
    model: Optional[str] = Field(None, max_length=100)
    input_tokens: int = Field(0, ge=0, le=100_000_000)
    output_tokens: int = Field(0, ge=0, le=100_000_000)
    attribution: Optional[AttributionMeta] = None
    occurred_at: Optional[datetime] = None  # default: now (UTC)
    idempotency_key: Optional[str] = Field(None, min_length=1, max_length=64)


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    timestamp: datetime
    version: str
    database: str
    redis: str = "not_configured"
    sentry: str = "not_configured"


class ProvidersResponse(BaseModel):
    """List of supported providers"""

    providers: List[str]
    count: int


class ProvisionKeyRequest(BaseModel):
    """Server-to-server request to provision an API key for an authenticated
    OAuth account. Called by the website after Google/GitHub sign-in. There is
    no anonymous key-minting path — every key is tied to an account_id."""

    name: str = Field(..., min_length=1, max_length=100)
    tier: Literal["free", "pro", "team", "enterprise"] = "free"
    account_id: str = Field(..., min_length=1, max_length=255)


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

    # Validate key prefix: fk_ (standard), fkt_ (team seat), fkr_ (read-only)
    if not api_key.startswith(("fk_", "fkt_", "fkr_")):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    # Check against database
    key_hash = _hash_key(api_key)
    db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash, ApiKey.is_active == True).first()

    if not db_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check rate limit (still in-memory — ephemeral by design)
    if not rate_limiter.is_allowed(key_hash):
        logger.warning("Rate limit exceeded", extra={
            'event': 'rate_limit_exceeded',
            'key_hash': key_hash[:12],
            'ip': 'redacted',
        })
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Max 100 requests/minute, 10000/day.",
        )

    return api_key


# ============================================================================
# Metering helpers
# ============================================================================

# group_by dimensions allowed on /api/meter/report ("day" maps to bucket_date)
_REPORT_DIMENSIONS = {
    "feature": UsageEvent.feature,
    "customer_id": UsageEvent.customer_id,
    "workflow": UsageEvent.workflow,
    "provider": UsageEvent.provider,
    "model": UsageEvent.model,
    "day": UsageEvent.bucket_date,
    "event_type": UsageEvent.event_type,
}

# exact-match filters reusable across report/events
_EVENT_FILTERS = {
    "feature": UsageEvent.feature,
    "customer_id": UsageEvent.customer_id,
    "workflow": UsageEvent.workflow,
    "provider": UsageEvent.provider,
    "model": UsageEvent.model,
    "event_type": UsageEvent.event_type,
}


def _micro_to_usd(micro: Optional[int]) -> Optional[float]:
    """Convert integer micro-dollars to a USD float (6 dp). None stays None."""
    if micro is None:
        return None
    return round(micro / 1_000_000, 6)


def _serialize_usage_event(ev: UsageEvent) -> dict:
    """Public representation of a UsageEvent — never exposes key_hash, id,
    idempotency_key, or raw micro-dollar integers."""
    return {
        "event_id": ev.event_id,
        "event_type": ev.event_type,
        "request_id": ev.request_id,
        "feature": ev.feature,
        "customer_id": ev.customer_id,
        "workflow": ev.workflow,
        "environment": ev.environment,
        "tags": ev.tags,
        "provider": ev.provider,
        "model": ev.model,
        "input_tokens": ev.input_tokens,
        "output_tokens": ev.output_tokens,
        "tokens_saved": ev.tokens_saved,
        "cost_estimated": ev.cost_estimated,
        "cost_usd": _micro_to_usd(ev.cost_microdollars),
        "cost_saved_usd": _micro_to_usd(ev.cost_saved_microdollars),
        "pricing_version": ev.pricing_version,
        "occurred_at": ev.occurred_at,
        "created_at": ev.created_at,
    }


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

    # Check Redis connectivity
    redis_status = "not_configured"
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis as _redis
            r = _redis.from_url(redis_url, socket_connect_timeout=1)
            r.ping()
            redis_status = "connected"
        except Exception:
            redis_status = "disconnected"

    # Check Sentry
    sentry_status = "not_configured"
    try:
        import sentry_sdk
        if sentry_sdk.is_initialized():
            sentry_status = "active"
    except Exception:
        pass

    is_healthy = db_status == "connected"
    status = "healthy" if is_healthy else "degraded"
    status_code = 200 if is_healthy else 503

    response_data = HealthResponse(
        status=status,
        timestamp=utcnow(),
        version="1.5.0",
        database=db_status,
    )

    health_content = {
        "status": response_data.status,
        "timestamp": response_data.timestamp.isoformat(),
        "version": response_data.version,
        "database": response_data.database,
        "redis": redis_status,
        "sentry": sentry_status,
    }

    if status_code != 200:
        return JSONResponse(status_code=status_code, content=health_content)
    return JSONResponse(status_code=200, content=health_content)


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
        # Block read-only keys from optimization (Layer 4)
        if api_key.startswith("fkr_"):
            raise HTTPException(
                status_code=403,
                detail="Read-only keys cannot perform optimizations. Use a standard key.",
            )

        # Track IP for key sharing detection (Layer 1 — detection only)
        key_hash = _hash_key(api_key)
        client_ip = req.headers.get("x-forwarded-for", req.client.host if req.client else "unknown").split(",")[0].strip()
        client_ua = req.headers.get("user-agent", "unknown")
        sharing_anomaly = key_sharing_detector.track_request(key_hash, client_ip, client_ua)
        if sharing_anomaly:
            logger.warning("Key sharing anomaly detected", extra={
                'event': 'key_sharing_anomaly',
                'key_hash': key_hash[:12],
                'level': sharing_anomaly['level'],
                'reason': sharing_anomaly['reason'],
                'unique_ips': sharing_anomaly['unique_ips'],
                'unique_user_agents': sharing_anomaly['unique_user_agents'],
            })

        # Enforce free tier token limit (with monthly reset)
        db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
        if db_key:
            # Reset monthly counter if a new month has started
            now = utcnow()
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
            db_key.last_used_at = utcnow()
            if not db_key.first_used_at:
                db_key.first_used_at = utcnow()

        # Write audit log (technique truncated to fit VARCHAR(100) column)
        log_entry = OptimizationLog(
            request_id=request_id,
            key_hash=key_hash,
            original_tokens=result.original_tokens,
            optimized_tokens=result.optimized_tokens,
            savings=result.savings,
            savings_percentage=round(result.savings_percentage, 2),
            technique=result.technique_used[:100],
            level=request.level,
            provider=request.provider,
        )
        db.add(log_entry)

        # Metering: estimate cost ONLY when model is explicitly provided
        # (provider defaults to "openai", so estimating from a defaulted provider
        # would fabricate costs the caller never implied). Record one usage event
        # in the same commit as the audit log.
        cost_info = None
        ev_cost_estimated = False
        ev_cost_microdollars = None
        ev_cost_saved_microdollars = None
        ev_pricing_version = None
        if request.model:
            orig_est = estimate_cost_microdollars(request.provider, request.model, result.original_tokens, 0)
            if orig_est is not None:
                opt_est = estimate_cost_microdollars(request.provider, request.model, result.optimized_tokens, 0)
                save_est = estimate_cost_microdollars(request.provider, request.model, result.savings, 0)
                ev_cost_estimated = True
                ev_cost_microdollars = orig_est["total_microdollars"]
                ev_cost_saved_microdollars = save_est["total_microdollars"]
                ev_pricing_version = PRICING_VERSION
                cost_info = CostInfo(
                    estimated=True,
                    original_cost_usd=_micro_to_usd(orig_est["total_microdollars"]),
                    optimized_cost_usd=_micro_to_usd(opt_est["total_microdollars"]),
                    savings_usd=_micro_to_usd(save_est["total_microdollars"]),
                    pricing_version=PRICING_VERSION,
                )

        attr = request.attribution
        ev_occurred = utcnow()
        usage_event = UsageEvent(
            event_id=f"ue_{uuid.uuid4().hex[:12]}",
            key_hash=key_hash,
            event_type="optimize",
            request_id=request_id,
            feature=attr.feature if attr else None,
            customer_id=attr.customer_id if attr else None,
            workflow=attr.workflow if attr else None,
            environment=attr.environment if attr else None,
            tags=attr.tags if attr else None,
            provider=request.provider,
            model=request.model,
            input_tokens=result.original_tokens,
            output_tokens=0,
            tokens_saved=result.savings,
            cost_estimated=ev_cost_estimated,
            cost_microdollars=ev_cost_microdollars,
            cost_saved_microdollars=ev_cost_saved_microdollars,
            pricing_version=ev_pricing_version,
            occurred_at=ev_occurred,
            bucket_date=ev_occurred.strftime("%Y-%m-%d"),
        )
        db.add(usage_event)
        db.commit()

        logger.info(
            f"Optimization [{request_id}]: {result.savings} tokens saved "
            f"({result.savings_percentage:.1f}%) via {result.technique_used}"
        )

        # Check if approaching free tier limit (80% warning)
        usage_warning = None
        if db_key and not tier_config.get("unlimited"):
            usage_pct = (db_key.monthly_tokens_used / tier_config["tokens_per_month"]) * 100
            if usage_pct >= 80:
                remaining = tier_config["tokens_per_month"] - db_key.monthly_tokens_used
                usage_warning = {
                    "level": "warning" if usage_pct < 100 else "limit",
                    "message": f"You've used {usage_pct:.0f}% of your {tier_config['tokens_per_month']:,} monthly tokens. Upgrade to Pro ($15/mo) for unlimited.",
                    "used": db_key.monthly_tokens_used,
                    "limit": tier_config["tokens_per_month"],
                    "remaining": max(0, remaining),
                    "upgrade_url": "/pricing",
                }

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
            timestamp=utcnow(),
            technique=result.technique_used,
            cost=cost_info,
        )

        # Add rate limit headers
        rl_headers = rate_limiter.get_headers(key_hash)
        response_content = jsonable_encoder(response_data)
        if usage_warning:
            response_content["usage_warning"] = usage_warning
        return JSONResponse(
            content=response_content,
            headers=rl_headers,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Optimization error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Metering endpoints (cost attribution)
# ============================================================================


@app.post("/api/meter/track")
async def meter_track(
    request: TrackUsageRequest,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Record externally-incurred LLM usage for cost attribution."""
    # Read-only keys may not write usage
    if api_key.startswith("fkr_"):
        raise HTTPException(status_code=403, detail="Read-only keys cannot track usage")

    if request.input_tokens + request.output_tokens == 0:
        raise HTTPException(
            status_code=422,
            detail="At least one of input_tokens or output_tokens must be > 0",
        )

    now = utcnow()
    occurred = request.occurred_at or now
    # Normalize aware datetimes to naive UTC
    if occurred.tzinfo is not None:
        occurred = occurred.astimezone(timezone.utc).replace(tzinfo=None)
    if occurred > now + timedelta(minutes=5):
        raise HTTPException(status_code=422, detail="occurred_at cannot be in the future")
    if occurred < now - timedelta(days=90):
        raise HTTPException(status_code=422, detail="occurred_at cannot be older than 90 days")

    key_hash = _hash_key(api_key)

    # Idempotency: return the existing event if this key already used this idempotency_key
    if request.idempotency_key:
        existing = db.query(UsageEvent).filter(
            UsageEvent.key_hash == key_hash,
            UsageEvent.idempotency_key == request.idempotency_key,
        ).first()
        if existing is not None:
            return _track_response(existing, duplicate=True)

    est = estimate_cost_microdollars(
        request.provider, request.model, request.input_tokens, request.output_tokens
    )
    attr = request.attribution
    event = UsageEvent(
        event_id=f"ue_{uuid.uuid4().hex[:12]}",
        key_hash=key_hash,
        event_type="external",
        request_id=None,
        feature=attr.feature if attr else None,
        customer_id=attr.customer_id if attr else None,
        workflow=attr.workflow if attr else None,
        environment=attr.environment if attr else None,
        tags=attr.tags if attr else None,
        provider=request.provider,
        model=request.model,
        input_tokens=request.input_tokens,
        output_tokens=request.output_tokens,
        tokens_saved=0,
        cost_estimated=est is not None,
        cost_microdollars=est["total_microdollars"] if est else None,
        cost_saved_microdollars=None,
        pricing_version=PRICING_VERSION if est else None,
        idempotency_key=request.idempotency_key,
        occurred_at=occurred,
        bucket_date=occurred.strftime("%Y-%m-%d"),
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent insert with the same (key_hash, idempotency_key) — return the winner
        db.rollback()
        existing = db.query(UsageEvent).filter(
            UsageEvent.key_hash == key_hash,
            UsageEvent.idempotency_key == request.idempotency_key,
        ).first()
        if existing is not None:
            return _track_response(existing, duplicate=True)
        raise
    db.refresh(event)

    logger.info("meter_track", extra={
        "event": "meter_track",
        "key_hash": key_hash[:12],
        "tokens": request.input_tokens + request.output_tokens,
    })
    return _track_response(event, duplicate=False)


def _track_response(event: UsageEvent, duplicate: bool) -> dict:
    return {
        "event_id": event.event_id,
        "status": "recorded",
        "duplicate": duplicate,
        "cost": {
            "estimated": event.cost_estimated,
            "cost_usd": _micro_to_usd(event.cost_microdollars),
            "pricing_version": event.pricing_version,
        },
        "occurred_at": jsonable_encoder(event.occurred_at),
        "timestamp": jsonable_encoder(utcnow()),
    }


@app.get("/api/meter/report")
async def meter_report(
    group_by: str = "feature",
    start: Optional[str] = None,
    end: Optional[str] = None,
    feature: Optional[str] = None,
    customer_id: Optional[str] = None,
    workflow: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    event_type: Optional[str] = None,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Aggregated cost-attribution report, grouped by up to 3 dimensions."""
    dims = [d.strip() for d in group_by.split(",") if d.strip()]
    if not dims:
        dims = ["feature"]
    if len(dims) > 3:
        raise HTTPException(status_code=422, detail="group_by: maximum 3 dimensions")
    for d in dims:
        if d not in _REPORT_DIMENSIONS:
            raise HTTPException(status_code=422, detail=f"Invalid group_by dimension: {d}")

    today = utcnow().strftime("%Y-%m-%d")
    start_date = start or (utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    end_date = end or today
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start cannot be after end")

    key_hash = _hash_key(api_key)
    exact = {
        "feature": feature, "customer_id": customer_id, "workflow": workflow,
        "provider": provider, "model": model, "event_type": event_type,
    }

    def _base_filters(q):
        q = q.filter(
            UsageEvent.key_hash == key_hash,
            UsageEvent.bucket_date >= start_date,
            UsageEvent.bucket_date <= end_date,
        )
        for name, val in exact.items():
            if val is not None:
                q = q.filter(_EVENT_FILTERS[name] == val)
        return q

    cost_sum = func.coalesce(func.sum(UsageEvent.cost_microdollars), 0)
    saved_sum = func.coalesce(func.sum(UsageEvent.cost_saved_microdollars), 0)
    unpriced = func.sum(case((UsageEvent.cost_estimated == False, 1), else_=0))  # noqa: E712
    aggregates = [
        func.count().label("events"),
        func.coalesce(func.sum(UsageEvent.input_tokens), 0).label("input_tokens"),
        func.coalesce(func.sum(UsageEvent.output_tokens), 0).label("output_tokens"),
        func.coalesce(func.sum(UsageEvent.tokens_saved), 0).label("tokens_saved"),
        cost_sum.label("cost_microdollars"),
        saved_sum.label("cost_saved_microdollars"),
        unpriced.label("unpriced_events"),
    ]

    # Totals (no grouping)
    totals_row = _base_filters(db.query(*aggregates)).one()
    totals = {
        "events": totals_row.events,
        "input_tokens": int(totals_row.input_tokens),
        "output_tokens": int(totals_row.output_tokens),
        "tokens_saved": int(totals_row.tokens_saved),
        "cost_usd": _micro_to_usd(int(totals_row.cost_microdollars)),
        "cost_saved_usd": _micro_to_usd(int(totals_row.cost_saved_microdollars)),
        "unpriced_events": int(totals_row.unpriced_events or 0),
    }

    # Grouped query
    group_cols = [_REPORT_DIMENSIONS[d].label(f"g_{i}") for i, d in enumerate(dims)]
    grouped_q = _base_filters(db.query(*group_cols, *aggregates))
    grouped_q = grouped_q.group_by(*group_cols).order_by(
        cost_sum.desc(), func.count().desc()
    ).limit(1000)

    groups = []
    for row in grouped_q.all():
        key = {dims[i]: getattr(row, f"g_{i}") for i in range(len(dims))}
        groups.append({
            "key": key,
            "events": row.events,
            "input_tokens": int(row.input_tokens),
            "output_tokens": int(row.output_tokens),
            "tokens_saved": int(row.tokens_saved),
            "cost_usd": _micro_to_usd(int(row.cost_microdollars)),
            "cost_saved_usd": _micro_to_usd(int(row.cost_saved_microdollars)),
            "unpriced_events": int(row.unpriced_events or 0),
        })

    return {
        "start": start_date,
        "end": end_date,
        "group_by": dims,
        "totals": totals,
        "groups": groups,
    }


@app.get("/api/meter/events")
async def meter_events(
    limit: int = 50,
    offset: int = 0,
    feature: Optional[str] = None,
    customer_id: Optional[str] = None,
    workflow: Optional[str] = None,
    provider: Optional[str] = None,
    event_type: Optional[str] = None,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Raw paginated usage events for the authenticated key."""
    if not (1 <= limit <= 200):
        raise HTTPException(status_code=422, detail="limit must be between 1 and 200")
    if offset < 0:
        raise HTTPException(status_code=422, detail="offset must be >= 0")

    key_hash = _hash_key(api_key)
    exact = {
        "feature": feature, "customer_id": customer_id, "workflow": workflow,
        "provider": provider, "event_type": event_type,
    }

    q = db.query(UsageEvent).filter(UsageEvent.key_hash == key_hash)
    for name, val in exact.items():
        if val is not None:
            q = q.filter(_EVENT_FILTERS[name] == val)

    total = q.count()
    rows = q.order_by(UsageEvent.created_at.desc(), UsageEvent.id.desc()).limit(limit).offset(offset).all()

    return {
        "events": [jsonable_encoder(_serialize_usage_event(ev)) for ev in rows],
        "limit": limit,
        "offset": offset,
        "total": total,
    }


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

    sharing_stats = key_sharing_detector.get_stats(key_hash)

    return {
        "tier": tier,
        "tokens_optimized": db_key.tokens_optimized,
        "tokens_saved": db_key.tokens_saved,
        "requests": db_key.requests,
        "tokens_limit": "unlimited" if is_unlimited else token_limit,
        "tokens_remaining": "unlimited" if is_unlimited else max(0, token_limit - db_key.tokens_optimized),
        "rate_limit": rate_info,
        "reset_date": (utcnow().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat(),
        "security": {
            "unique_ips_today": sharing_stats["unique_ips"],
            "unique_clients_today": sharing_stats["unique_user_agents"],
            "requests_today": sharing_stats["requests_today"],
        },
    }


@app.get("/api/pricing")
async def get_pricing():
    """Get pricing information (public endpoint, no auth)"""
    return {
        "tiers": {
            "free": {
                "tokens_per_month": 10000,
                "price_monthly": 0,
                "max_seats": 1,
                "features": ["10K tokens/month", "5 core integration channels", "Basic metrics dashboard", "Community support"],
            },
            "pro": {
                "tokens_per_month": "unlimited",
                "price_monthly": 15.00,
                "max_seats": 1,
                "features": ["Unlimited tokens", "All 12 integration platforms", "Advanced analytics", "API access", "Email support"],
            },
            "team": {
                "tokens_per_month": "unlimited",
                "price_monthly": "sliding_scale",
                "max_seats": 500,
                "pricing_scale": {
                    "1-5": {"base": 60, "per_seat": 12.00},
                    "6-25": {"per_seat": 10.00},
                    "26-100": {"per_seat": 8.00},
                    "101-249": {"per_seat": 7.00},
                    "250-500": {"per_seat": 6.00},
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


@app.post("/api/keys/provision")
async def provision_api_key(
    request: ProvisionKeyRequest,
    x_provision_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Provision an API key for an authenticated OAuth account (server-to-server).

    There is NO anonymous key minting. The website calls this after a Google/
    GitHub sign-in, passing the shared PROVISION_SECRET and the account id.

    - Auth: X-Provision-Secret must equal env PROVISION_SECRET (or the dev
      default outside production). Missing/mismatch -> 403. Unset in
      production -> 503 (fail closed).
    - tier "free": at most ONE active free key per account_id (409 on dup),
      and a global daily ceiling (429 when exceeded).
    """
    expected_secret = _resolve_provision_secret()
    if expected_secret is None:
        # Production with no PROVISION_SECRET configured: fail closed.
        logger.error(
            "Provision endpoint misconfigured: PROVISION_SECRET unset in production",
            extra={"event": "provision_misconfigured"},
        )
        raise HTTPException(status_code=503, detail="Key provisioning is misconfigured")

    if not x_provision_secret or x_provision_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid or missing provisioning secret")

    is_free = request.tier == "free"

    # Pre-check: one active free key per account_id (DB unique index is the
    # backstop; this gives a clean 409 instead of an IntegrityError).
    if is_free:
        existing = (
            db.query(ApiKey)
            .filter(
                ApiKey.account_id == request.account_id,
                ApiKey.tier == "free",
                ApiKey.is_active == True,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail="free key already provisioned for this account",
            )

        # Global daily ceiling on free provisioning (cost control).
        ceiling = _max_free_provisions_per_day()
        new_total = _incr_free_provision_count()
        if new_total > ceiling:
            logger.error(
                "Free provisioning daily ceiling exceeded",
                extra={
                    "event": "free_provision_ceiling",
                    "count": new_total,
                    "ceiling": ceiling,
                },
            )
            raise HTTPException(
                status_code=429,
                detail="Daily free-provisioning limit reached. Try again tomorrow.",
            )

    new_key = f"fk_{uuid.uuid4().hex}"
    key_hash = _hash_key(new_key)

    db_key = ApiKey(
        key_hash=key_hash,
        name=request.name,
        tier=request.tier,
        account_id=request.account_id,
    )
    db.add(db_key)
    try:
        db.commit()
    except IntegrityError:
        # Lost a race to the partial unique index — surface the same 409.
        db.rollback()
        if is_free:
            raise HTTPException(
                status_code=409,
                detail="free key already provisioned for this account",
            )
        raise

    logger.info(
        f"API key provisioned: {new_key[:12]}... "
        f"(name={request.name}, tier={request.tier}, account_id={request.account_id})"
    )

    return {
        "api_key": new_key,
        "tier": request.tier,
        "account_id": request.account_id,
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
    request_id = getattr(request.state, 'request_id', 'unknown')
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": exc.detail,
            "request_id": request_id,
            "timestamp": utcnow().isoformat(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}",
        exc_info=True,
        extra={
            'request_id': request_id,
            'method': request.method,
            'path': str(request.url.path),
            'event': 'unhandled_exception',
        }
    )
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": "Internal server error",
            "request_id": request_id,
            "timestamp": utcnow().isoformat(),
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
    logger.info("Starting Fortress Token Optimizer API v1.5.0")

    # Initialize Sentry error tracking
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        try:
            from sentry_setup import init_sentry
            init_sentry()
            logger.info("Sentry initialized")
        except Exception as e:
            logger.warning(f"Sentry initialization failed: {e}")

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

    # Flush Sentry events before shutdown
    try:
        import sentry_sdk
        sentry_sdk.flush(timeout=5)
        logger.info("Sentry events flushed")
    except Exception:
        pass

    # Close database connection pool
    try:
        from database import engine
        engine.dispose()
        logger.info("Database connections closed")
    except Exception:
        pass

    logger.info("Shutdown complete")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
