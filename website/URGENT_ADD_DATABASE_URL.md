# ⚠️ URGENT: Add DATABASE_URL to Vercel

## Issue
The API endpoints are failing because `DATABASE_URL` is not set in Vercel environment variables.

Error:
```
Environment variable not found: DATABASE_URL.
```

## Fix (2 Minutes)

### Step 1: Go to Vercel Dashboard
1. Navigate to: https://vercel.com/dashboard
2. Select project: `fortress-optimizer-monorepo`
3. Click **Settings** tab (top menu)

### Step 2: Add Environment Variables
1. In left sidebar, click **Environment Variables**
2. Click **Add New**

### Step 3: Add DATABASE_URL
Enter these values:
```
Key: DATABASE_URL
Value: postgres://ebe7b9fdb7b1c89c0447d39e00aaf1b3a1d83db90a6014c23cc21db252a4c854:sk_hfDIAJVXZeEnRxAxHEh8p@db.prisma.io:5432/postgres?sslmode=require

Environments to enable:
✓ Production
✓ Preview  
✓ Development
```

4. Click **Add**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Find the latest deployment (should be at top)
3. Click the **...** menu
4. Select **Redeploy**

Wait 2-3 minutes for deployment to complete.

---

## Verify It Works

After redeployment, test with:
```bash
curl https://www.fortress-optimizer.com/api/webhook/email
# Should return: {"status":"ok","message":"Email webhook is ready..."}
```

Then run tests:
```bash
./test-email-flows.sh
```

---

## Environment Variables Summary

After adding DATABASE_URL, you should have these set in Vercel:

| Key | Value | Status |
|-----|-------|--------|
| `DATABASE_URL` | `postgres://...` | ⏳ NEED TO ADD |
| `JWT_SECRET` | (from earlier) | ✅ Should be set |
| `NEXTAUTH_SECRET` | (from earlier) | ✅ Should be set |
| `NEXTAUTH_URL` | `https://fortress-optimizer.com` | ✅ Should be set |
| `RESEND_API_KEY` | `re_8FqPAC...` | ✅ Should be set |
| `FROM_EMAIL` | `noreply@fortress-optimizer.com` | ✅ Should be set |

---

## Status

- ❌ **API Endpoints**: Failing (waiting for DATABASE_URL)
- ⏳ **Deployment**: Ready to redeploy
- 🎯 **Next Step**: Add DATABASE_URL and redeploy

