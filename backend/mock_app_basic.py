"""
Fortress Token Optimizer - Mock FastAPI Backend for Testing
Provides mock endpoints for load and security testing without dependencies
HARDENED for security testing
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
import json
from datetime import datetime
from typing import Optional
import re
import html

app = FastAPI(title="Fortress Token Optimizer", version="1.0.0")

# Enable CORS with proper headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'"
    response.headers["X-Content-Security-Policy"] = "default-src 'self'"
    return response

# Add request size limit middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Limit request body size to 1MB"""
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 1_000_000:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large (max 1MB)"}
            )
    return await call_next(request)

# Models with validation
class OptimizeRequest(BaseModel):
    provider: str
    text: str
    model: str
    user_id: Optional[str] = None
    
    @validator('provider')
    def validate_provider(cls, v):
        """Validate provider is in whitelist"""
        allowed = {"anthropic", "openai", "google", "slack", "npm", "vscode", "discord", "make", "zapier"}
        if v not in allowed:
            raise ValueError(f"Invalid provider. Must be one of: {allowed}")
        return v
    
    @validator('text')
    def validate_text(cls, v):
        """Validate text input"""
        if not v or len(v) == 0:
            raise ValueError("Text cannot be empty")
        if len(v) > 100000:
            raise ValueError("Text too long (max 100KB)")
        # Remove null bytes
        v = v.replace('\x00', '')
        return v
    
    @validator('model')
    def validate_model(cls, v):
        """Validate model"""
        if not v or len(v) == 0:
            raise ValueError("Model cannot be empty")
        if len(v) > 100:
            raise ValueError("Model name too long")
        return v
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate user_id"""
        if v and not re.match(r'^[a-zA-Z0-9_\-]{1,100}$', v):
            raise ValueError("Invalid user_id format")
        return v

class OptimizeResponse(BaseModel):
    optimized_text: str
    original_tokens: int
    optimized_tokens: int
    savings_percentage: float

class UsageResponse(BaseModel):
    user_id: str
    tokens_used: int
    tokens_remaining: int
    plan: str

class PricingTier(BaseModel):
    name: str
    tokens_per_month: str
    price: float

class PricingResponse(BaseModel):
    plans: list[PricingTier]

class HealthResponse(BaseModel):
    status: str
    timestamp: str

# Endpoints
@app.get("/health")
async def health() -> HealthResponse:
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat()
    )

@app.post("/optimize")
async def optimize(request: OptimizeRequest) -> OptimizeResponse:
    """Token optimization endpoint - hardened against attacks"""
    
    try:
        # Input validation happens in pydantic model
        # No dynamic query construction - safe
        
        # Mock optimization (reduce by 15-25%)
        original_tokens = max(1, len(request.text.split()))
        reduction_factor = 0.20  # 20% reduction
        optimized_tokens = max(1, int(original_tokens * (1 - reduction_factor)))
        savings = min(100, max(0, reduction_factor * 100))
        
        # Create mock optimized text with proper escaping
        words = request.text.split()
        optimized_text = " ".join(words[::2] if len(words) > optimized_tokens else words)[:len(request.text)//2]
        
        # Escape HTML special characters
        optimized_text = html.escape(optimized_text or request.text[:50])
        
        return OptimizeResponse(
            optimized_text=optimized_text,
            original_tokens=original_tokens,
            optimized_tokens=optimized_tokens,
            savings_percentage=savings
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Don't leak error details
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/usage")
async def usage(user_id: str) -> UsageResponse:
    """Usage tracking endpoint"""
    return UsageResponse(
        user_id=user_id,
        tokens_used=45000,
        tokens_remaining=5000,
        plan="pro"
    )

@app.get("/pricing")
async def pricing() -> PricingResponse:
    """Pricing information endpoint"""
    return PricingResponse(
        plans=[
            PricingTier(name="free", tokens_per_month="50000", price=0.0),
            PricingTier(name="pro", tokens_per_month="unlimited", price=9.99),
            PricingTier(name="team", tokens_per_month="unlimited", price=99.0),
        ]
    )

@app.get("/providers")
async def providers():
    """List supported providers"""
    return {
        "providers": ["anthropic", "openai", "google", "slack", "npm", "vscode", "discord", "make", "zapier"],
        "total": 9
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
