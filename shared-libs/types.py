"""
Type definitions for Fortress Token Optimizer
Safe to export to frontend clients
"""

from typing import Literal, Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class TokenCounts:
    """Token counts for a prompt"""
    original: int
    optimized: int
    savings: int
    savings_percentage: float


@dataclass
class OptimizationLevel:
    """Optimization level configuration"""
    level: Literal["conservative", "balanced", "aggressive"]
    description: str
    estimated_savings_percentage: float


@dataclass
class OptimizationResponse:
    """Response from /api/optimize endpoint"""
    request_id: str
    status: Literal["success", "error", "rate_limited"]
    optimization: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    tokens: Optional[TokenCounts] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class UserSubscription:
    """User subscription tier"""
    tier: Literal["free", "pro", "team", "enterprise"]
    token_limit: int  # monthly tokens
    features: Dict[str, bool] = field(default_factory=dict)
    expires_at: Optional[datetime] = None


@dataclass
class APIKey:
    """API key for client authentication"""
    key_id: str
    masked_key: str  # for display
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool = True


OPTIMIZATION_LEVELS = {
    "conservative": OptimizationLevel(
        level="conservative",
        description="Light optimization, minimal changes",
        estimated_savings_percentage=5,
    ),
    "balanced": OptimizationLevel(
        level="balanced",
        description="Moderate optimization, good balance",
        estimated_savings_percentage=15,
    ),
    "aggressive": OptimizationLevel(
        level="aggressive",
        description="Heavy optimization, maximum savings",
        estimated_savings_percentage=30,
    ),
}

PROVIDERS = [
    "openai",
    "anthropic",
    "azure",
    "gemini",
    "groq",
    "ollama",
]

PRICING_TIERS = {
    "free": {"tokens_per_month": 50000, "price_monthly": 0},
    "pro": {"tokens_per_month": float("inf"), "price_monthly": 9.99},
    "team": {"tokens_per_month": float("inf"), "price_monthly": 99.00},
    "enterprise": {"tokens_per_month": float("inf"), "price_monthly": "custom"},
}
