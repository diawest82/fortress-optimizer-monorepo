# Fortress Token Optimizer Website - Vercel Deployment Guide

## Two Deployment Options

### Option 1: Deploy via Vercel CLI (Fastest - 2 minutes)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Navigate to website directory
cd website

# 3. Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Production deployment (y/n): y
# - Build settings: Use defaults (npm run build / npm run start)
```

✅ Your site will be live at: `fortress-optimizer.vercel.app`

---

### Option 2: Deploy via GitHub (Recommended for Continuous Deployment)

#### Step 1: Connect Repository to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository (diawest82/fortress-optimizer-monorepo)
4. Click "Import"

#### Step 2: Configure Project
- **Project Name**: `fortress-optimizer-website`
- **Framework**: Next.js (auto-detected)
- **Root Directory**: `website/` (Vercel will auto-detect)
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Start Command**: `npm start`
- **Node.js Version**: 20.x

#### Step 3: Add Environment Variables (if needed)
```
NEXT_PUBLIC_API_URL=https://api.fortress-optimizer.com
FORTRESS_API_KEY=your-api-key-here
```

#### Step 4: Deploy
Click "Deploy" button

✅ Site live at: `fortress-optimizer.vercel.app`  
✅ Auto-deploys on `git push` to main branch

---

## Post-Deployment Setup

### 1. Custom Domain (Optional)
```
1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your custom domain (e.g., fortress-optimizer.com)
3. Follow DNS configuration instructions
```

### 2. Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:
```
NEXT_PUBLIC_API_URL=https://api.fortress-optimizer.com
```

### 3. Monitoring & Analytics
- Vercel provides built-in analytics
- Real-time logs available in Dashboard
- Automatic performance monitoring

### 4. Edge Functions (Optional)
For API optimization at edge:
```
Create: website/src/app/api/optimize/route.ts
Vercel auto-deploys as serverless function
```

---

## Verification Commands

```bash
# Check build succeeds
cd website && npm run build

# Test production build locally
npm run build && npm start
# Open http://localhost:3000

# Check Next.js compatibility
npx next -v
```

---

## Expected Deployment Times
- **First deploy**: 2-3 minutes (installs dependencies)
- **Subsequent deploys**: 30-60 seconds (incremental builds)

---

## Success Indicators
✅ No build errors  
✅ Site loads at fortress-optimizer.vercel.app  
✅ Home page shows live demo  
✅ Dashboard loads with metrics  
✅ Install guides display properly  
✅ Copy-to-clipboard works  

---

## Troubleshooting

**Build fails with "tsconfig.json" error**
- Vercel auto-generates if missing, no action needed

**"Cannot find module" errors**
- Run `npm install` locally first
- Ensure package-lock.json is committed

**Static 404 pages**
- Next.js handles automatically with 404.tsx

**API calls failing**
- Set NEXT_PUBLIC_API_URL environment variable
- Ensure backend is deployed (fortress-optimizer-monorepo API)

---

## Current Status

✅ Website code: Ready for deployment  
✅ Build scripts: Configured  
✅ Dependencies: Locked in package-lock.json  
✅ Next.js version: 16.1.6 (latest)  

**Ready to deploy!** Choose Option 1 (CLI) or Option 2 (GitHub) above.
