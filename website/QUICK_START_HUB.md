# 🚀 Fortress Quick Reference - Development Stack

## Start Your Development Session

```bash
# One command starts everything
bash start-dev.sh

# Then open:
# - Hub:  http://127.0.0.1:3333
# - App:  http://localhost:3000
```

---

## System Status

| Service | Status | URL | Port |
|---------|--------|-----|------|
| **Hub** | ✅ Running | http://127.0.0.1:3333 | 3333 |
| **App** | ✅ Running | http://localhost:3000 | 3000 |
| **Workspace** | ✅ Connected | Registered with hub | — |

---

## What You Can Do Right Now

### Create User Accounts
```
Visit: http://localhost:3000/auth/signup
Enter: Email, password, name
Result: Account created + auto-logged in
```

### Generate API Keys
```
1. Go to: http://localhost:3000/account (login first)
2. Click: API Keys tab
3. Click: Generate Key
4. Copy: Key to use in tools
```

### View Usage Metrics
```
Go to: http://localhost:3000/account → Overview tab
See: Token savings, latency, coverage
```

---

## Essential Commands

```bash
# START
bash start-dev.sh              # Everything
bash start-dev.sh --hub-only   # Just hub
bash start-dev.sh --app-only   # Just app

# STOP
bash stop-dev.sh               # Everything

# CHECK
python verify_connection.py    # Hub connected?
curl http://127.0.0.1:3333/info    # Hub healthy?

# LOGS
tail -f .dev-hub.log           # Hub output
tail -f .dev-app.log           # App output
```

---

## How It Works

```
You Start Services
      ↓
Hub Service Runs (port 3333)
      ↓
Next.js App Runs (port 3000)
      ↓
Workspace Auto-Registers with Hub
      ↓
Dashboard Shows You're Connected
      ↓
Ready to Test Features
```

---

## Making Changes

```
1. Edit code (VS Code, vim, etc.)
2. App hot-reloads automatically
3. Test in browser
4. Hub stays connected
5. Repeat!
```

---

## Troubleshooting

### Hub not working?
```bash
bash stop-dev.sh
bash start-dev.sh --hub-only
```

### App not working?
```bash
bash stop-dev.sh
bash start-dev.sh --app-only
```

### Connection broken?
```bash
python sync_to_hub.py
python verify_connection.py
```

### Ports in use?
```bash
bash stop-dev.sh  # Cleans up automatically
```

---

## Quick Tests

### Hub is working:
```bash
curl http://127.0.0.1:3333/health
# Returns: {"status": "healthy", ...}
```

### App is working:
```bash
curl http://localhost:3000 | head -20
# Returns: HTML content
```

### Connected to hub:
```bash
python verify_connection.py
# Returns: ✓ CONNECTED
```

### See connected workspaces:
```bash
curl http://127.0.0.1:3333/workspaces
# Returns: {"count": 1, "workspaces": [{"id": "website", ...}]}
```

---

## Files

| File | Purpose |
|------|---------|
| `hub_service.py` | Hub server |
| `start-dev.sh` | Start both services |
| `stop-dev.sh` | Stop both services |
| `sync_to_hub.py` | Connect to hub |
| `verify_connection.py` | Check connection |
| `.hub_config.json` | Hub settings |
| `.workspace_hub_sync.json` | Connection status |

---

## Documentation

- **[COMPLETE_STATUS_REPORT.md](COMPLETE_STATUS_REPORT.md)** - Full system overview
- **[DEVELOPMENT_WITH_HUB.md](DEVELOPMENT_WITH_HUB.md)** - Development guide
- **[HUB_CONNECTION_GUIDE.md](HUB_CONNECTION_GUIDE.md)** - Hub details

---

## URLs You'll Use

| Page | URL | Purpose |
|------|-----|---------|
| Home | http://localhost:3000 | Marketing page |
| Signup | http://localhost:3000/auth/signup | Create account |
| Login | http://localhost:3000/auth/login | Sign in |
| Dashboard | http://localhost:3000/account | User dashboard (protected) |
| Hub Health | http://127.0.0.1:3333/health | Check hub status |
| Hub Info | http://127.0.0.1:3333/info | Hub details |
| Workspaces | http://127.0.0.1:3333/workspaces | See connected workspaces |

---

## What's Next?

### This Week
- [ ] Test user signup/login flows
- [ ] Generate and copy API keys
- [ ] Verify hub connection stays active
- [ ] Review dashboard functionality

### Next Week
- [ ] Implement API key validation endpoint
- [ ] Build token optimization engine
- [ ] Test external tool integrations

### Week 3+
- [ ] Migrate to PostgreSQL
- [ ] Set up production environment
- [ ] Launch beta

---

## Key Features

✅ User authentication (signup/login)  
✅ Secure password hashing (bcryptjs)  
✅ JWT sessions (30-day expiry)  
✅ API key generation & management  
✅ Protected routes (middleware)  
✅ Hub integration (workspace discovery)  
✅ Live metrics dashboard  
✅ Responsive design  

---

## Support

**Everything's connected and ready!**

If something breaks:
1. Stop services: `bash stop-dev.sh`
2. Start fresh: `bash start-dev.sh`
3. Check status: `python verify_connection.py`

Questions? Check the full guides:
- Hub issues → HUB_CONNECTION_GUIDE.md
- Development workflow → DEVELOPMENT_WITH_HUB.md
- Complete details → COMPLETE_STATUS_REPORT.md

---

**Status**: ✅ Ready for Development  
**Hub**: ✅ Connected  
**App**: ✅ Running  
**Last Updated**: Feb 15, 2026

🚀 **Happy coding!**
