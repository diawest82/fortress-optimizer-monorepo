"""
Extension Integration Endpoints for Fortress Optimizer Backend

These endpoints handle:
- Extension settings sync
- Device management
- API key management for extensions
- Cross-device synchronization
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/extension", tags=["extension"])

# ============================================================================
# Models
# ============================================================================

class ExtensionSettings(BaseModel):
    """Extension configuration stored in cloud"""
    enabled: bool = True
    auto_optimize: bool = True
    show_suggestions: bool = True
    theme: str = "auto"  # light, dark, auto
    optimization_level: str = "balanced"  # conservative, balanced, aggressive
    
class ExtensionSyncData(BaseModel):
    """Data synced from extension to cloud"""
    device_id: str
    extension_version: str
    settings: ExtensionSettings
    last_action: str = ""
    timestamp: datetime = None
    
    def __init__(self, **data):
        if 'timestamp' not in data:
            data['timestamp'] = datetime.utcnow()
        super().__init__(**data)

class Device(BaseModel):
    """Registered device using the extension"""
    device_id: str
    name: str
    extension_version: str
    last_sync: datetime
    created_at: datetime
    platform: str  # vscode, jetbrains, etc
    os: str  # windows, mac, linux
    
class ApiKey(BaseModel):
    """API key for extension authentication"""
    key_id: str
    name: str
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool = True
    token_prefix: str  # Shows first 8 chars like "fk_abc123**"

# ============================================================================
# Helper: Get current user from token/API key
# ============================================================================

async def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None)
) -> str:
    """Extract user_id from either Bearer token or API key"""
    if authorization and authorization.startswith("Bearer "):
        # Extract user_id from JWT token
        token = authorization.split(" ")[1]
        # In real implementation, validate JWT
        # For now, extract user_id from payload
        return "user_from_jwt"
    elif x_api_key:
        # Validate API key and return associated user_id
        # This would query a database to find the user
        return "user_from_apikey"
    else:
        raise HTTPException(status_code=401, detail="Not authenticated")

# ============================================================================
# Endpoints
# ============================================================================

@router.get("/settings", response_model=ExtensionSettings)
async def get_extension_settings(
    user_id: str = Depends(get_current_user_from_header)
) -> ExtensionSettings:
    """
    Get extension settings for the current user.
    These are synced to all devices.
    """
    # In real implementation, query database
    return ExtensionSettings(
        enabled=True,
        auto_optimize=True,
        show_suggestions=True,
        theme="auto",
        optimization_level="balanced"
    )

@router.put("/settings", response_model=ExtensionSettings)
async def update_extension_settings(
    settings: ExtensionSettings,
    user_id: str = Depends(get_current_user_from_header)
) -> ExtensionSettings:
    """
    Update extension settings for the current user.
    Changes are propagated to all connected devices.
    """
    # In real implementation:
    # 1. Validate settings
    # 2. Update in database
    # 3. Publish event to notify other devices
    # 4. Return updated settings
    
    return settings

@router.post("/sync", response_model=ExtensionSyncData)
async def sync_extension_data(
    sync_data: ExtensionSyncData,
    user_id: str = Depends(get_current_user_from_header)
) -> ExtensionSyncData:
    """
    Sync extension state from device to cloud.
    
    This is called:
    - When extension first starts (get settings)
    - After user changes settings (save changes)
    - Periodically (every 5 minutes)
    - Before shutdown
    """
    # In real implementation:
    # 1. Validate device_id
    # 2. Check extension version
    # 3. Merge settings if conflicts
    # 4. Store sync data
    # 5. Return merged state
    
    sync_data.timestamp = datetime.utcnow()
    return sync_data

@router.get("/devices", response_model=List[Device])
async def get_connected_devices(
    user_id: str = Depends(get_current_user_from_header)
) -> List[Device]:
    """
    Get all devices this user has the extension installed on.
    Useful for:
    - Showing settings sync status
    - Managing API keys per device
    - Remote uninstall/revoke access
    """
    # In real implementation, query database for user's devices
    return [
        Device(
            device_id=str(uuid.uuid4()),
            name="MacBook Pro",
            extension_version="0.0.1",
            last_sync=datetime.utcnow(),
            created_at=datetime.utcnow(),
            platform="vscode",
            os="mac"
        )
    ]

@router.post("/telemetry")
async def send_telemetry(
    telemetry_data: dict,
    user_id: str = Depends(get_current_user_from_header)
):
    """
    Send telemetry data from extension (optional).
    
    Data examples:
    - Feature usage (how often they use auto-optimize)
    - Error logs
    - Performance metrics
    - User engagement
    """
    # In real implementation:
    # 1. Validate telemetry data format
    # 2. Store in analytics database
    # 3. Aggregate for dashboards
    # 4. Return success
    
    return {"status": "telemetry_recorded"}

# ============================================================================
# API Key Management
# ============================================================================

@router.post("/api-keys", response_model=dict)
async def create_api_key(
    body: dict,
    user_id: str = Depends(get_current_user_from_header)
) -> dict:
    """
    Create a new API key for extension authentication.
    
    Returns the full key (only shown once for security).
    User must save it securely.
    """
    key_name = body.get("name", "Extension Key")
    
    # In real implementation:
    # 1. Generate cryptographically secure API key
    # 2. Hash it for storage
    # 3. Store in database with user_id
    # 4. Return full key (only time it's shown)
    
    api_key = f"fk_{uuid.uuid4().hex[:32]}"
    
    return {
        "api_key": api_key,
        "key_id": "key_" + uuid.uuid4().hex[:12],
        "message": "Store this key securely. It won't be shown again."
    }

@router.get("/api-keys", response_model=List[ApiKey])
async def list_api_keys(
    user_id: str = Depends(get_current_user_from_header)
) -> List[ApiKey]:
    """
    List all API keys for this user.
    Used to manage extension authentication.
    """
    # In real implementation, query database
    return [
        ApiKey(
            key_id="key_abc123",
            name="VSCode Extension",
            created_at=datetime.utcnow(),
            last_used=datetime.utcnow(),
            is_active=True,
            token_prefix="fk_abc123**"
        )
    ]

@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user_from_header)
):
    """
    Revoke an API key.
    Useful for:
    - Removing old/compromised keys
    - Revoking access on lost devices
    - Cleaning up unused keys
    """
    # In real implementation:
    # 1. Mark key as inactive in database
    # 2. Invalidate any active sessions using this key
    # 3. Return success
    
    return {"status": "api_key_revoked", "key_id": key_id}

# ============================================================================
# Cross-Device Sync
# ============================================================================

@router.post("/broadcast")
async def broadcast_settings_change(
    change_data: dict,
    user_id: str = Depends(get_current_user_from_header)
):
    """
    Broadcast a settings change to all user's devices.
    
    This is called when:
    - User changes settings in website
    - User changes settings in extension on device A
    
    All other devices get notification on next sync.
    """
    # In real implementation:
    # 1. Validate change_data
    # 2. Update settings
    # 3. Publish event to message queue (Redis/RabbitMQ)
    # 4. All connected devices receive notification
    # 5. Extension updates UI automatically
    
    return {
        "status": "broadcast_queued",
        "affected_devices": 2
    }
