# Vercel Environment Variables Setup Guide

## Production Environment Variables Required

Configure these in Vercel Dashboard → Project Settings → Environment Variables

### 1. Authentication Secrets (REQUIRED - Generated)

```env
JWT_SECRET=d2fc839798498c4ee2cd8a59049940e3a2729c6ab3a1739fb15cc9ff90ca182d
NEXTAUTH_SECRET=8c1a06db2d0071225942931c5e0e87c26a3479001b95b59fd9acb89b2cf22b4e
NEXTAUTH_URL=https://fortress-optimizer.com
```

### 2. Email Service (Resend API - ALREADY CONFIGURED)

```env
RESEND_API_KEY=re_8FqPAC24_165diXF8j22Gd2QjechjGm6x
FROM_EMAIL=noreply@fortress-optimizer.com
```

### 3. Database (PostgreSQL - REQUIRES SETUP)

```env
DATABASE_URL=postgresql://user:password@host:5432/fortress
```

**PostgreSQL Setup Steps:**
1. Create PostgreSQL database (Vercel Postgres, AWS RDS, or similar)
2. Get connection string in format: `postgresql://user:password@host:5432/dbname`
3. Add to Vercel environment variables as `DATABASE_URL`
4. Run migrations: `npx prisma migrate deploy`

### 4. Google OAuth (Optional - For Social Login)

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

---

## How to Add to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select project: `fortress-optimizer-monorepo`

2. **Add Environment Variables**
   - Click "Settings" tab
   - Select "Environment Variables" 
   - Add each variable:
     - **Key:** JWT_SECRET
     - **Value:** d2fc839798498c4ee2cd8a59049940e3a2729c6ab3a1739fb15cc9ff90ca182d
     - **Environments:** Production, Preview, Development

3. **Repeat for all variables** (NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL, etc.)

4. **Redeploy to activate**
   - Push new commit to main branch, OR
   - Redeploy manually: Settings → Deployments → Redeploy

---

## Vercel Postgres Setup (Recommended)

If using Vercel's managed PostgreSQL:

1. Go to Vercel Dashboard → Storage
2. Create new PostgreSQL database
3. Copy connection string to `DATABASE_URL`
4. Run migrations automatically

---

## Current Status

✅ Frontend: Live at fortress-optimizer.com
⏳ Backend: Needs database URL
⏳ Authentication: Secrets ready (add to Vercel)
⏳ Database: PostgreSQL connection needed

---

## Next Steps

1. **Immediate (5 minutes):**
   - Add JWT_SECRET and NEXTAUTH_SECRET to Vercel
   - Set NEXTAUTH_URL to https://fortress-optimizer.com

2. **Short-term (30 minutes):**
   - Provision PostgreSQL database
   - Add DATABASE_URL to Vercel
   - Verify Resend API key is configured

3. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Test authentication flow**

---

## Security Notes

- Never commit `.env` files with secrets
- Use Vercel's built-in secret management
- Rotate secrets periodically
- Keep NEXTAUTH_SECRET safe (needed for JWT signing)

