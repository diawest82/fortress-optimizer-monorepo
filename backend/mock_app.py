"""
Fortress Token Optimizer - Mock FastAPI Backend for Testing
Provides mock endpoints for load and security testing without dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
from datetime import datetime
from typing import Optional

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
    return response

# Models
class OptimizeRequest(BaseModel):
    provider: str
    text: str
    model: str
    user_id: Optional[str] = None

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
    """Token optimization endpoint"""
    
    # Validate input
    if not request.text or len(request.text) == 0:
        raise HTTPException(status_code=400, detail="Text is required")
    
    if not request.provider or request.provider not in ["anthropic", "openai", "google", "slack", "npm", "vscode"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    # Mock optimization (reduce by 15-25%)
    original_tokens = len(request.text.split())
    reduction_factor = 0.20  # 20% reduction
    optimized_tokens = int(original_tokens * (1 - reduction_factor))
    savings = reduction_factor * 100
    
    # Create mock optimized text with escaped HTML
    words = request.text.split()
    optimized_text = " ".join(words[::2] if len(words) > optimized_tokens else words)[:len(request.text)//2]
    
    # Escape HTML special characters
    import html
    optimized_text = html.escape(optimized_text or request.text[:50])
    
    return OptimizeResponse(
        optimized_text=optimized_text,
        original_tokens=original_tokens,
        optimized_tokens=optimized_tokens,
        savings_percentage=savings
    )

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
