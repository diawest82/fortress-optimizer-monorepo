"""
Fortress Token Optimizer - FastAPI Backend
Main API application with optimization, auth, and metrics endpoints
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime, timedelta
import logging
import os
from enum import Enum

# Import core optimization algorithm (backend-only)
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from shared_libs.core import TokenOptimizer, OptimizationResult
from shared_libs.fortress_types import (
    OPTIMIZATION_LEVELS,
    PROVIDERS,
    PRICING_TIERS,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Fortress Token Optimizer API",
    description="Backend API for token optimization (IP Protected)",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fortress-optimizer.com", "https://*.fortress-optimizer.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

# ============================================================================
# Request/Response Models
# ============================================================================


class OptimizeRequest(BaseModel):
    """Request to optimize a prompt"""

    prompt: str = Field(..., min_length=1, max_length=50000)
    level: Literal["conservative", "balanced", "aggressive"] = "balanced"
    provider: str = Field("openai", description="LLM provider")

    class Config:
        example = {
            "prompt": "Can you help me understand how to optimize token usage?",
            "level": "balanced",
            "provider": "openai",
        }


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


class ProvidersResponse(BaseModel):
    """List of supported providers"""

    providers: List[str]
    count: int


# ============================================================================
# Authentication
# ============================================================================


async def verify_api_key(authorization: Optional[str] = Header(None)) -> str:
    """Verify API key from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing API key")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    api_key = authorization.replace("Bearer ", "")

    # TODO: Validate API key against database
    # For now, accept any non-empty key
    if len(api_key) < 10:
        raise HTTPException(status_code=401, detail="Invalid API key format")

    return api_key


async def check_rate_limit(api_key: str) -> bool:
    """Check if API key is rate limited"""
    # TODO: Implement rate limiting with Redis
    # For now, always allow
    return True


# ============================================================================
# Endpoints
# ============================================================================


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        version="1.0.0",
    )


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
):
    """
    Optimize a prompt for token efficiency

    This endpoint:
    1. Receives prompt from client
    2. Runs proprietary optimization algorithm (BACKEND ONLY)
    3. Returns optimized prompt and token savings
    4. Never exposes algorithm details
    """
    try:
        # Generate request ID for tracking
        request_id = f"opt_{datetime.utcnow().timestamp()}"

        # Check rate limit
        is_allowed = await check_rate_limit(api_key)
        if not is_allowed:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded",
            )

        # Run optimization (algorithm stays here, never goes to client)
        optimizer = TokenOptimizer(provider=request.provider)
        result: OptimizationResult = optimizer.optimize(
            prompt=request.prompt,
            level=request.level,
            context_window=8000,
        )

        # Log optimization (for metrics, not for exposing algorithm)
        logger.info(
            f"Optimization: {result.savings} tokens saved "
            f"({result.savings_percentage:.1f}%) using {result.technique_used}"
        )

        # Return only safe information to client
        # NEVER include algorithm implementation details
        response = OptimizeResponse(
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

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/usage")
async def get_usage(api_key: str = Depends(verify_api_key)):
    """Get token usage for API key"""
    # TODO: Query database for usage statistics
    return {
        "api_key": api_key[:10] + "...",
        "tokens_used_this_month": 25000,
        "tokens_limit": 50000,
        "tokens_remaining": 25000,
        "percentage_used": 50,
        "reset_date": (datetime.utcnow() + timedelta(days=15)).isoformat(),
    }


@app.get("/api/pricing")
async def get_pricing():
    """Get pricing information (public endpoint)"""
    return {
        "tiers": PRICING_TIERS,
        "currency": "USD",
        "billing_cycle": "monthly",
    }


# ============================================================================
# Error Handlers
# ============================================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler"""
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
    """General exception handler"""
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


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Starting Fortress Token Optimizer API")
    # TODO: Initialize database connections, Redis, etc.


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Fortress Token Optimizer API")
    # TODO: Close database connections, etc.


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
