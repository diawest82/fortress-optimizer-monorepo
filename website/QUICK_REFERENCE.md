# 🚀 Quick Reference Card - Backend & Authentication

## Server Status
- **URL**: http://localhost:3000
- **Status**: ✅ Running
- **Command**: `npm run dev`

---

## Quick Links

| Task | Link | Time |
|------|------|------|
| Start Testing | [TEST_GUIDE.md](./TEST_GUIDE.md) | 2 hours |
| Setup Tools | [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | 30 min |
| Full Docs | [BACKEND_SETUP_COMPLETE.md](./BACKEND_SETUP_COMPLETE.md) | 20 min |
| Overview | [README_AUTH.md](./README_AUTH.md) | 5 min |
| Status | [STATUS_REPORT.md](./STATUS_REPORT.md) | 5 min |

---

## Accounts Created (Test These)

### Test Account 1
```
Email:    test@fortress.dev
Password: TestPassword123
```

### Test Account 2
```
Email:    test.user@fortress.dev
Password: TestPassword123
```

---

## Key URLs

| Page | URL | Purpose |
|------|-----|---------|
| Home | http://localhost:3000 | Homepage |
| Signup | http://localhost:3000/auth/signup | Create account |
| Login | http://localhost:3000/auth/login | Login |
| Dashboard | http://localhost:3000/account | Protected |
| API Keys | http://localhost:3000/account#api-keys | Generate keys |

---

## Create Test Account (3 min)

1. Go to: **http://localhost:3000/auth/signup**
2. Fill:
   - Email: `test@fortress.dev`
   - Name: `Test User`
   - Password: `TestPassword123`
3. Check terms & click "Create account"
4. ✅ Logged in at `/account`

---

## Generate API Key (1 min)

1. Go to: **http://localhost:3000/account**
2. Click: "API Keys" tab
3. Click: "Generate Key"
4. Enter: `Test Key`
5. Click: "Create Key"
6. Click: "Copy" to copy full key
7. ✅ Key in clipboard: `fk_prod_...`

---

## Test Scenarios

### Test 1: Sign Up Flow (5 min)
```
→ /auth/signup
→ Create account
→ Auto-login to /account
✓ Dashboard loads
```

### Test 2: Login Flow (3 min)
```
→ Logout
→ /auth/login
→ Enter credentials
→ /account loads
✓ Session active
```

### Test 3: Protected Routes (2 min)
```
→ Clear cookies
→ Visit /account
→ Redirects to /auth/login
→ Login
→ Back to /account
✓ Protection works
```

### Test 4: API Keys (2 min)
```
→ /account
→ "API Keys" tab
→ Generate key
→ Copy it
→ Revoke it
✓ Works as expected
```

---

## Common Tasks

### Login
```
URL: http://localhost:3000/auth/login
Email: test@fortress.dev
Pass: TestPassword123
```

### Logout
```
Click: "Log out" button
Redirects: Home page
```

### Generate Key
```
Dashboard → API Keys tab
Click: "Generate Key"
Enter: Key name
Copy: Full key (only shown once)
```

### Revoke Key
```
Dashboard → API Keys tab
Click: "Revoke" on key
Confirm: Yes
Key deleted
```

### Check Session
```
DevTools: F12
Tab: Application
Click: Cookies
Find: next-auth.session-token
```

---

## Environment Setup

### Required
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<min 32 chars>
```

### Optional (Later)
```env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
DATABASE_URL=postgresql://...
```

### Generate Secret
```bash
openssl rand -base64 32
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't login | Verify account exists (try signup) |
| Session lost | Check NEXTAUTH_SECRET set |
| API key fails | Verify key copied completely |
| Server won't start | Try: `rm -rf .next && npm install` |
| Cookies not working | Enable 3rd party cookies |

---

## File Locations

```
src/
├── auth-config.ts      ← NextAuth setup
├── app/auth/signup     ← Signup form
├── app/auth/login      ← Login form
├── app/account/        ← Dashboard
├── components/
│   ├── account-content.tsx  ← API keys UI
│   └── session-provider.tsx ← Auth wrapper
└── middleware.ts       ← Route protection
```

---

## API Key Format

**Structure**: `fk_prod_<random>`

**Example**: 
```
fk_prod_abc123def456ghi789jkl012mno345
```

**Where to Use**:
- npm package: `setApiKey(key)`
- VS Code: Paste in settings
- Slack: `/fortress auth <key>`
- Claude: Config file
- GitHub: Extension settings

---

## Testing Checklist

Quick validation:

- [ ] Can create account
- [ ] Can login
- [ ] Dashboard loads
- [ ] Can generate API key
- [ ] Can copy key
- [ ] Can revoke key
- [ ] Session persists (refresh)
- [ ] Protected routes work
- [ ] Logout works

**All checked?** ✅ You're good to go!

---

## Next Steps

1. **Test Now** → Follow [TEST_GUIDE.md](./TEST_GUIDE.md)
2. **Integrate Tools** → Use [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
3. **Production** → Database + OAuth + Deploy

---

## Support

**Questions?** Check:
- [Full Documentation](./BACKEND_SETUP_COMPLETE.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Test Guide](./TEST_GUIDE.md)

**Found issue?** See Troubleshooting above

---

**Last Updated**: January 2025  
**Status**: ✅ Ready to Test  
**Dev Server**: http://localhost:3000
