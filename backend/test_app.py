#!/usr/bin/env python3
"""
Simple test backend for ECS deployment verification
"""
import uvicorn
from fastapi import FastAPI
from datetime import datetime

app = FastAPI(title="Fortress Optimizer Backend - Test")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-test"
    }

@app.get("/api/v1/optimize")
async def optimize(level: str = "standard"):
    return {
        "level": level,
        "status": "success",
        "result": {
            "optimized_tokens": 1000,
            "estimated_savings": 45.23,
            "currency": "USD"
        }
    }

@app.get("/")
async def root():
    return {
        "service": "Fortress Token Optimizer Backend",
        "version": "1.0.0-test",
        "status": "ready"
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
