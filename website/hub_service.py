#!/usr/bin/env python3
"""
Lightweight Mock Hub Service for Local Development

This is a simple hub service that responds to workspace registration requests
and provides basic health checks. Use this during local development to keep
the Fortress workspace connected to a hub.

Usage:
    python hub_service.py

The service will start on http://127.0.0.1:3333

Press Ctrl+C to stop.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError:
    print("❌ FastAPI is not installed.")
    print("\nInstall required packages:")
    print("  pip install fastapi uvicorn")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Fortress Hub Service", version="1.0.0")

# In-memory registry of connected workspaces
WORKSPACE_REGISTRY: Dict[str, Any] = {}
HUB_CONFIG = {
    "name": "Fortress Hub (Development)",
    "version": "1.0.0",
    "mode": "development",
    "started_at": datetime.utcnow().isoformat() + "Z"
}


@app.get("/health")
async def health_check():
    """Health check endpoint - indicates hub is running."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "mode": "development"
    }


@app.post("/register")
async def register_workspace(request: Request):
    """Register a workspace with the hub."""
    try:
        payload = await request.json()
        workspace_id = payload.get("workspace_id", "unknown")
        workspace_path = payload.get("workspace_path", "")
        
        # Store workspace in registry
        WORKSPACE_REGISTRY[workspace_id] = {
            "payload": payload,
            "registered_at": datetime.utcnow().isoformat() + "Z",
            "last_seen": datetime.utcnow().isoformat() + "Z"
        }
        
        logger.info(f"✓ Workspace registered: {workspace_id} ({workspace_path})")
        
        return {
            "status": "registered",
            "workspace_id": workspace_id,
            "message": f"Workspace '{workspace_id}' successfully registered with hub",
            "hub_config": HUB_CONFIG,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/workspaces")
async def list_workspaces():
    """List all registered workspaces."""
    workspaces = []
    for workspace_id, info in WORKSPACE_REGISTRY.items():
        workspaces.append({
            "id": workspace_id,
            "path": info["payload"].get("workspace_path"),
            "registered_at": info["registered_at"],
            "last_seen": info["last_seen"]
        })
    
    return {
        "count": len(workspaces),
        "workspaces": workspaces,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/workspaces/{workspace_id}")
async def get_workspace(workspace_id: str):
    """Get details about a specific workspace."""
    if workspace_id not in WORKSPACE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found")
    
    info = WORKSPACE_REGISTRY[workspace_id]
    return {
        "id": workspace_id,
        "payload": info["payload"],
        "registered_at": info["registered_at"],
        "last_seen": info["last_seen"]
    }


@app.post("/workspaces/{workspace_id}/heartbeat")
async def workspace_heartbeat(workspace_id: str):
    """Update last seen timestamp for a workspace."""
    if workspace_id not in WORKSPACE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found")
    
    WORKSPACE_REGISTRY[workspace_id]["last_seen"] = datetime.utcnow().isoformat() + "Z"
    
    return {
        "status": "heartbeat_received",
        "workspace_id": workspace_id,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/info")
async def hub_info():
    """Get information about the hub."""
    return {
        "hub": HUB_CONFIG,
        "workspaces_connected": len(WORKSPACE_REGISTRY),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/")
async def root():
    """Root endpoint - welcome message."""
    return {
        "message": "Welcome to Fortress Hub",
        "status": "running",
        "version": HUB_CONFIG["version"],
        "mode": HUB_CONFIG["mode"],
        "endpoints": {
            "health": "GET /health",
            "register": "POST /register",
            "workspaces": "GET /workspaces",
            "info": "GET /info"
        }
    }


if __name__ == "__main__":
    print("╔════════════════════════════════════════════════════════════╗")
    print("║         Fortress Hub Service (Development Mode)           ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    print("📡 Hub starting on http://127.0.0.1:3333")
    print()
    print("Available endpoints:")
    print("  GET  http://127.0.0.1:3333/health         - Health check")
    print("  GET  http://127.0.0.1:3333/info           - Hub information")
    print("  GET  http://127.0.0.1:3333/workspaces     - List workspaces")
    print("  POST http://127.0.0.1:3333/register       - Register workspace")
    print()
    print("Press Ctrl+C to stop the hub service")
    print()
    
    try:
        uvicorn.run(app, host="127.0.0.1", port=3333, log_level="info")
    except KeyboardInterrupt:
        print("\n✓ Hub service stopped")
