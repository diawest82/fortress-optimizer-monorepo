# Fortress Development with Hub Connection

## ✅ Hub is Now Active!

Your Fortress Token Optimizer workspace is **now connected to a local hub service** for full development connectivity.

---

## Quick Start

### Start Everything at Once

```bash
bash start-dev.sh
```

This starts:
- **Hub Service** on http://127.0.0.1:3333
- **Next.js App** on http://localhost:3000

Both services run in the background.

### Start Services Individually

```bash
# Start only hub service
bash start-dev.sh --hub-only

# Start only Next.js app
bash start-dev.sh --app-only
```

### Stop Everything

```bash
bash stop-dev.sh
```

---

## What's Running

### Hub Service (`hub_service.py`)

A lightweight, development-grade hub that:
- ✅ Registers workspaces
- ✅ Tracks workspace metadata
- ✅ Provides health checks
- ✅ Manages workspace discovery
- ✅ Runs on **http://127.0.0.1:3333**

**Features**:
- `/health` - Health check
- `/register` - Register workspace
- `/workspaces` - List connected workspaces
- `/info` - Hub information

### Next.js App

Your Fortress Token Optimizer application:
- ✅ Frontend (React/TypeScript)
- ✅ Authentication system
- ✅ API endpoints
- ✅ Dashboard
- ✅ Runs on **http://localhost:3000**

---

## Hub Connection Details

### Workspace Registration

When you start the hub service, your workspace automatically registers:

```
Hub Service Starts
      ↓
Workspace detects hub at 127.0.0.1:3333
      ↓
sync_to_hub.py sends registration
      ↓
Hub confirms: "Workspace 'website' successfully registered"
      ↓
.workspace_hub_sync.json updated with connection details
      ↓
✓ CONNECTED - Ready to use
```

### View Connection Status

```bash
# Check detailed connection status
python verify_connection.py

# View last sync details
cat .workspace_hub_sync.json | python3 -m json.tool

# List all workspaces connected to hub
curl http://127.0.0.1:3333/workspaces | python3 -m json.tool
```

### Hub Endpoints

```bash
# Get hub information
curl http://127.0.0.1:3333/info

# Check hub health
curl http://127.0.0.1:3333/health

# List workspaces
curl http://127.0.0.1:3333/workspaces

# Get specific workspace
curl http://127.0.0.1:3333/workspaces/website
```

---

## Development Workflow

### Typical Development Session

```bash
# 1. Start the full stack
bash start-dev.sh

# 2. Open browser
# Hub:  http://127.0.0.1:3333
# App:  http://localhost:3000

# 3. Make changes to code
# (Edit files normally)

# 4. App hot-reloads automatically
# (No need to restart)

# 5. Hub stays connected
# (Workspace registered and discoverable)

# 6. When done
bash stop-dev.sh
```

### Making Changes

```bash
# Edit files as usual
vim src/components/my-component.tsx
# or use VS Code

# Changes auto-reload in browser
# No manual restart needed
```

### Checking Hub Status

```bash
# In another terminal, check hub status
curl -s http://127.0.0.1:3333/info | python3 -m json.tool

# Shows:
# - Hub is running
# - How many workspaces connected
# - Hub version and mode
```

---

## Configuration

### Hub Configuration (`.hub_config.json`)

```json
{
  "hub_endpoint": "http://127.0.0.1:3333",
  "timeout": 10,
  "retry_attempts": 3,
  "retry_delay": 2,
  "enable_local_fallback": true,
  "mode": "development"
}
```

### Change Hub Endpoint (For Team Setup)

If multiple developers need to share a hub:

```bash
# Update to a team hub server
bash INSTALL_HUB_CONNECTOR/install.sh --hub-url http://team-hub.example.com:3333

# Verify connection
python verify_connection.py
```

---

## Logs and Debugging

### View Hub Logs

```bash
# Real-time hub logs
tail -f .dev-hub.log

# Full hub log
cat .dev-hub.log

# Hub logs show:
# - Workspace registrations
# - Health checks
# - Connection status
# - Errors and warnings
```

### View App Logs

```bash
# Real-time app logs
tail -f .dev-app.log

# Full app log
cat .dev-app.log
```

### Check Port Status

```bash
# Check if ports are in use
lsof -i :3333  # Hub port
lsof -i :3000  # App port

# If ports are stuck, stop-dev.sh will clean them up
bash stop-dev.sh
```

---

## Hub Features During Development

### Workspace Discovery

Your workspace is now discoverable:

```bash
curl http://127.0.0.1:3333/workspaces
# Returns all connected workspaces
```

### Metadata Tracking

Hub stores your workspace info:
- Workspace ID: `website`
- Path: `/Users/diawest/projects/fortress-optimizer-monorepo/website`
- Python version: 3.9
- Connection timestamp
- Last seen timestamp

### Future Extensibility

The hub can be extended to support:
- Cross-workspace communication
- Metrics aggregation
- Real-time collaboration features
- Workspace-to-workspace API calls
- Shared state management

---

## Troubleshooting

### Hub Won't Start

```bash
# Check if port 3333 is already in use
lsof -i :3333

# Kill any existing process
lsof -i :3333 | awk 'NR>1 {print $2}' | xargs kill -9

# Try again
bash start-dev.sh --hub-only
```

### App Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill any existing process
lsof -i :3000 | awk 'NR>1 {print $2}' | xargs kill -9

# Try again
bash start-dev.sh --app-only
```

### Connection Shows "Fallback Mode"

This happens when:
1. Hub service isn't running
2. Hub is too slow to respond
3. Network issues

**Solution**: 
```bash
# Restart the stack
bash stop-dev.sh
bash start-dev.sh
```

### Verify Everything Works

```bash
# Check both services
lsof -i :3333
lsof -i :3000

# Test hub
curl -s http://127.0.0.1:3333/health

# Test app
curl -s http://localhost:3000 | head -20

# Check workspace connection
python verify_connection.py
```

---

## Files Reference

### New Files Created

| File | Purpose |
|------|---------|
| `hub_service.py` | Lightweight hub service for development |
| `start-dev.sh` | Start both hub and app services |
| `stop-dev.sh` | Stop all services gracefully |
| `.dev-hub.log` | Hub service logs (auto-created) |
| `.dev-app.log` | App service logs (auto-created) |
| `.dev-hub.pid` | Hub process ID (auto-created) |
| `.dev-app.pid` | App process ID (auto-created) |

### Existing Files (Updated)

| File | Change |
|------|--------|
| `.hub_config.json` | Added fallback endpoints and development mode |
| `.workspace_hub_sync.json` | Auto-updated when hub is running |

---

## Production Deployment

When deploying to production:

1. **Use a Production Hub Service**
   ```bash
   bash INSTALL_HUB_CONNECTOR/install.sh --hub-url https://hub.fortress-optimizer.dev
   ```

2. **Remove Development Scripts**
   ```bash
   rm start-dev.sh stop-dev.sh hub_service.py
   ```

3. **Deploy Application**
   ```bash
   npm run build
   npm start
   ```

The production hub endpoint will be used instead of localhost.

---

## Summary

✅ **Hub Service**: Running on http://127.0.0.1:3333  
✅ **Next.js App**: Running on http://localhost:3000  
✅ **Workspace**: Connected and registered with hub  
✅ **Development**: Ready for active development  

### Quick Commands

```bash
# Start everything
bash start-dev.sh

# Stop everything
bash stop-dev.sh

# Check hub status
curl http://127.0.0.1:3333/info

# Check workspace status
python verify_connection.py

# View hub logs
tail -f .dev-hub.log

# View app logs
tail -f .dev-app.log
```

---

**Mode**: Development with Hub  
**Hub Version**: 1.0.0 (Development)  
**Status**: ✅ Fully Connected  
**Last Updated**: February 15, 2026
