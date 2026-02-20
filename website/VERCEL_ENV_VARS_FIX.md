# 🚨 URGENT: Fix DATABASE_URL in Vercel

## Problem
The health check endpoint shows:
```
DATABASE_URL: ❌ NOT SET
PRISMA_DATABASE_URL: ❌ NOT SET
```

This means environment variables set in Vercel aren't being passed to the deployed application.

## Solution: Properly Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on **fortress-optimizer** project

### Step 2: Navigate to Environment Variables
1. Click **Settings** (top navigation)
2. Select **Environment Variables** (left sidebar)

### Step 3: Add These Environment Variables

**Add each variable individually:**

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | `postgres://ebe7b9fdb7b1c89c0447d39e00aaf1b3a1d83db90a6014c23cc21db252a4c854:sk_hfDIAJVXZeEnRxAxHEh8p@db.prisma.io:5432/postgres?sslmode=require` | ✓ Production ✓ Preview ✓ Development |
| `PRISMA_DATABASE_URL` | `prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19oZkRJQUpWWFplRW5SeEF4SEVoOHAiLCJhcGlfa2V5IjoiMDFLSE4yTllDQzk0NFY5WjRNUENXN1IyRDkiLCJ0ZW5hbnRfaWQiOiJlYmU3YjlmZGI3YjFjODljMDQ0N2QzOWUwMGFhZjFiM2ExZDgzZGI5MGE2MDE0YzIzY2MyMWRiMjUyYTRjODU0IiwiaW50ZXJuYWxfc2VjcmV0IjoiNjg1N2VlMjYtYzA4MC00ZWJmLWI5OGYtNTk4Mzc4NjI3YmNjIn0.CkuIfsT_Vpe5tvir3Jqr_ch07UY1piJr899KQ3ujc4Q` | ✓ Production ✓ Preview ✓ Development |
| `JWT_SECRET` | `fortress-jwt-secret-change-in-production-12345` | ✓ Production ✓ Preview ✓ Development |
| `NEXTAUTH_SECRET` | `fortress-auth-secret-change-in-production-12345` | ✓ Production ✓ Preview ✓ Development |
| `NEXTAUTH_URL` | `https://www.fortress-optimizer.com` | ✓ Production |
| `RESEND_API_KEY` | `re_8FqPAC24_165diXF8j22Gd2QjechjGm6x` | ✓ Production ✓ Preview ✓ Development |
| `FROM_EMAIL` | `noreply@fortress-optimizer.com` | ✓ Production ✓ Preview ✓ Development |

### Step 4: CRITICAL - Redeploy After Setting Variables

**Do NOT skip this step!**

1. After adding all variables, click **Settings** → **General**
2. Scroll down to **Git** section
3. Click **"Redeploy" button** next to the latest deployment (21d12c1)
   - OR go to **Deployments** tab and click redeploy on commit 21d12c1

**Why?** Vercel only passes environment variables to **new deployments**, not existing ones.

### Step 5: Verify the Fix

Once redeployment completes (2-3 minutes):

```bash
curl https://www.fortress-optimizer.com/api/health
```

Expected response:
```json
{
  "DATABASE_URL": "✅ SET",
  "PRISMA_DATABASE_URL": "✅ SET",
  "NODE_ENV": "production",
  "timestamp": "2026-02-17T12:37:28.462Z"
}
```

### Step 6: Test Email System

Once DATABASE_URL shows ✅ SET:

```bash
./test-email-flows.sh
```

Expected: All 12 tests passing ✅

---

## Troubleshooting

### Issue: Variables still show as NOT SET after redeploy

**Check 1: Verify All Environments Selected**
- Each variable must have checkboxes for Production, Preview, and Development checked

**Check 2: Clear Browser Cache**
- Hard refresh Vercel dashboard (Cmd+Shift+R on Mac)

**Check 3: Wait for Full Deployment**
- Vercel deployments take 2-3 minutes
- Check Deployments tab for "Ready" status

**Check 4: Check Variable Format**
- Ensure no trailing/leading spaces
- Database URL must start with `postgres://`
- Check for any special characters in the paste

### Issue: Database connection error after fix

If you see errors like "too many connections":
- This means DATABASE_URL IS working ✅
- It's a database pooling issue (Prisma Accelerate)
- The email system will still work, just slower

---

## Quick Copy-Paste Values

Save these if you need to re-add them:

```
DATABASE_URL=postgres://ebe7b9fdb7b1c89c0447d39e00aaf1b3a1d83db90a6014c23cc21db252a4c854:sk_hfDIAJVXZeEnRxAxHEh8p@db.prisma.io:5432/postgres?sslmode=require

PRISMA_DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19oZkRJQUpWWFplRW5SeEF4SEVoOHAiLCJhcGlfa2V5IjoiMDFLSE4yTllDQzk0NFY5WjRNUENXN1IyRDkiLCJ0ZW5hbnRfaWQiOiJlYmU3YjlmZGI3YjFjODljMDQ0N2QzOWUwMGFhZjFiM2ExZDgzZGI5MGE2MDE0YzIzY2MyMWRiMjUyYTRjODU0IiwiaW50ZXJuYWxfc2VjcmV0IjoiNjg1N2VlMjYtYzA4MC00ZWJmLWI5OGYtNTk4Mzc4NjI3YmNjIn0.CkuIfsT_Vpe5tvir3Jqr_ch07UY1piJr899KQ3ujc4Q

JWT_SECRET=fortress-jwt-secret-change-in-production-12345

NEXTAUTH_SECRET=fortress-auth-secret-change-in-production-12345

NEXTAUTH_URL=https://www.fortress-optimizer.com

RESEND_API_KEY=re_8FqPAC24_165diXF8j22Gd2QjechjGm6x

FROM_EMAIL=noreply@fortress-optimizer.com
```

---

## Status After Fix

Once complete:
- ✅ Database connected
- ✅ All 12 email endpoints operational
- ✅ User authentication working
- ✅ Email webhook receiving emails
- ✅ Production system fully functional
