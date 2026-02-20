# Hub Connection Guide - Fortress Token Optimizer

## Current Status

**Local Hub Service**: ❌ Not Running
**Fallback Mode**: ✅ Enabled (Workspace syncs locally)
**Development Mode**: ✅ Active

---

## Hub Overview

The **Unified Hub Connector** allows the Fortress Token Optimizer to register with a central hub service for:
- Workspace discovery and metadata tracking
- Cross-workspace communication
- Metrics aggregation
- Collaboration features

**Important**: The hub is **optional** for local development. The system works perfectly offline with fallback mode enabled.

---

## Current Configuration

**File**: `.hub_config.json`

```json
{
  "hub_endpoint": "http://127.0.0.1:3333",
  "fallback_endpoints": [
    "http://localhost:3333",
    "https://hub.fortress-optimizer.dev"
  ],
  "timeout": 10,
  "retry_attempts": 3,
  "retry_delay": 2,
  "enable_local_fallback": true,
  "mode": "development"
}
```

### Configuration Explanation

| Setting | Value | Meaning |
|---------|-------|---------|
| `hub_endpoint` | `http://127.0.0.1:3333` | Primary hub location (local) |
| `fallback_endpoints` | List of URLs | Backup endpoints to try |
| `timeout` | 10 seconds | Max time to wait for hub response |
| `retry_attempts` | 3 | Number of reconnection attempts |
| `enable_local_fallback` | `true` | Save state locally if hub unreachable |
| `mode` | `development` | Development mode (can be production) |

---

## Hub Connection Status

```bash
# Check current connection status
python verify_connection.py

# Output shows:
# ✓ CONNECTED - Workspace is registered with hub (even in fallback mode)
# ✓ State file found
# ✓ Config file found
# ✗ Hub is not responding (expected - service not running)
```

### What This Means

- **✓ CONNECTED**: Workspace is registered locally
- **✓ State file**: Connection metadata saved to `.workspace_hub_sync.json`
- **✗ Hub not responding**: Remote hub service offline (expected in development)
- **Fallback Active**: Workspace operates independently until hub available

---

## Hub Connection Scenarios

### Scenario 1: Local Development (Current)

**Setup**: Hub not running, fallback mode enabled

```
Fortress → sync_to_hub.py → Hub (not available)
                          ↓
                        Fallback
                          ↓
                    Local .workspace_hub_sync.json
```

**Use Case**: Development, testing, local experimentation
**Status**: ✅ Working
**Action**: None needed

---

### Scenario 2: Production with Remote Hub

**Setup**: Connect to production hub at `https://hub.fortress-optimizer.dev`

```bash
# Update configuration
bash INSTALL_HUB_CONNECTOR/install.sh --hub-url https://hub.fortress-optimizer.dev
```

**Use Case**: Production deployment, multi-workspace coordination
**Status**: Requires hub service running
**Action**: Execute command above before deploying

---

### Scenario 3: Local Hub Service

**Setup**: Run hub service locally at `http://127.0.0.1:3333`

```bash
# In separate terminal, start hub service:
cd /path/to/PATENT_FILINGS/06_PERSONAS/IMA_Eternal_Memory_DropIn
PYTHONPATH=src:$PYTHONPATH uvicorn ima_eml.service.app:app --port 3333

# Then verify connection
python verify_connection.py
```

**Use Case**: Local multi-workspace development
**Status**: Requires hub service implementation
**Action**: Not needed unless doing hub development

---

## Testing Hub Connection

### Check Hub Health

```bash
# Test if hub endpoint is responding
curl -s http://127.0.0.1:3333/health && echo "✓ Hub is responding" || echo "✗ Hub not responding"
```

### Check Port Availability

```bash
# Verify port 3333 is not in use
lsof -i :3333

# If port is free (expected), no output shown
```

### Verify Workspace State

```bash
# View current connection state
cat .workspace_hub_sync.json | python -m json.tool

# Look for:
# "status": "connected"
# "hub_endpoint": "http://127.0.0.1:3333"
# "mode": "local_fallback" (if hub unreachable)
```

---

## Syncing with Hub

### Manual Sync

```bash
# Register workspace with hub
python sync_to_hub.py

# Output:
# ✓ Registering workspace: website
# ✓ Saved locally (hub unreachable) - normal if hub service not running
# ✓ State saved to: .workspace_hub_sync.json
```

### Automatic Sync

The workspace automatically syncs on:
- Application startup
- Configuration changes
- Manual `python sync_to_hub.py` execution

---

## Troubleshooting

### Issue: "Hub is not responding"

**Cause**: Hub service not running on port 3333

**Solution**:
```bash
# Option 1: Start hub service
cd /path/to/hub/service
python -m uvicorn app:app --port 3333

# Option 2: Change hub endpoint (production)
bash INSTALL_HUB_CONNECTOR/install.sh --hub-url https://your-hub.com

# Option 3: Ignore (fallback mode handles it)
# No action needed - workspace syncs locally
```

### Issue: "Connection timeout"

**Cause**: Hub is slow to respond or unreachable

**Solution**:
```bash
# Increase timeout in .hub_config.json
{
  "timeout": 30,  # Changed from 10
  "retry_attempts": 5  # More retries
}

# Then re-sync
python sync_to_hub.py
```

### Issue: "State file not found"

**Cause**: Workspace never synced

**Solution**:
```bash
# Create state file by running sync
python sync_to_hub.py

# Verify it was created
ls -la .workspace_hub_sync.json
```

---

## Production Deployment

### Before Deploying to Production

1. **Get Hub Endpoint**
   ```bash
   # Obtain your production hub URL from DevOps
   export HUB_ENDPOINT="https://hub.fortress-optimizer.dev"
   ```

2. **Configure Hub Connection**
   ```bash
   bash INSTALL_HUB_CONNECTOR/install.sh --hub-url "$HUB_ENDPOINT"
   ```

3. **Verify Connection**
   ```bash
   python verify_connection.py
   # Should show:
   # ✓ Hub is responding
   # ✓ CONNECTED
   ```

4. **Deploy Application**
   ```bash
   npm run build
   npm start
   ```

### Configuration Management

**Development**: `.hub_config.json` (localhost)
**Production**: Environment-based override
```bash
# In deployment script
export HUB_ENDPOINT="https://hub.fortress-optimizer.dev"
bash INSTALL_HUB_CONNECTOR/install.sh --hub-url "$HUB_ENDPOINT"
```

---

## Hub Features (When Connected)

When hub is online, Fortress gains:

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Workspace Discovery** | Hub knows about all registered workspaces | Team collaboration |
| **Metrics Aggregation** | Combine metrics across workspaces | Organization-wide insights |
| **Cross-Workspace Sync** | Share settings and state | Consistent experience |
| **Collaborative Features** | Real-time updates from hub | Live team data |

**Without Hub**: All features work locally - fallback mode ensures offline operation.

---

## Development Workflow

### Standard Development (No Hub)

```bash
# 1. Start dev server
npm run dev

# 2. Make changes
# (Edit code)

# 3. Test locally
# (Hub not needed)

# 4. Commit and deploy
git push
```

### Multi-Workspace Development (With Hub)

```bash
# 1. Start hub service (separate terminal)
cd /path/to/hub && python -m uvicorn app:app --port 3333

# 2. Register workspaces
python sync_to_hub.py

# 3. Workspaces can now:
# - See each other
# - Share metrics
# - Synchronize state
```

---

## Files Created/Modified

| File | Purpose | Status |
|------|---------|--------|
| `.hub_config.json` | Hub configuration | ✅ Updated |
| `.workspace_hub_sync.json` | Connection state | ✅ Auto-generated |
| `sync_to_hub.py` | Registration script | ✅ Present |
| `verify_connection.py` | Health check | ✅ Present |
| `INSTALL_HUB_CONNECTOR/` | Installation toolkit | ✅ Present |

---

## Next Steps

### For Local Development
✅ **Done** - Fallback mode working, no action needed

### For Team Collaboration
1. Set up centralized hub service
2. Get production hub endpoint
3. Configure all workspaces to point to hub
4. Run `python sync_to_hub.py` on each workspace

### For Production Deployment
1. Obtain production hub endpoint from DevOps
2. Run: `bash INSTALL_HUB_CONNECTOR/install.sh --hub-url <endpoint>`
3. Verify with: `python verify_connection.py`
4. Deploy application

---

## Quick Reference

```bash
# Check hub status
python verify_connection.py

# Sync with hub
python sync_to_hub.py

# View connection state
cat .workspace_hub_sync.json | python -m json.tool

# Change hub endpoint (for production)
bash INSTALL_HUB_CONNECTOR/install.sh --hub-url https://your-hub.com

# Test hub endpoint
curl -s http://127.0.0.1:3333/health

# Check if port is available
lsof -i :3333
```

---

## Summary

| Aspect | Current | Status |
|--------|---------|--------|
| **Hub Service** | Not running | ❌ N/A for development |
| **Fallback Mode** | Enabled | ✅ Working |
| **Local Sync** | Active | ✅ Workspace registered |
| **Development** | Fully functional | ✅ No hub needed |
| **Production-Ready** | Configuration available | ⏳ Ready to deploy |

**Bottom Line**: Your Fortress Token Optimizer is **fully operational** in development mode with fallback sync enabled. When deploying to production, configure the hub endpoint and the system will automatically connect.

---

**Last Updated**: February 14, 2026  
**Configuration Version**: 1.0  
**Mode**: Development with Fallback
