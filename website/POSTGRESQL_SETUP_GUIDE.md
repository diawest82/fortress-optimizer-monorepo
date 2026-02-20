# PostgreSQL Database Setup Guide

## Option A: Vercel Postgres (RECOMMENDED - Easiest)

### Step 1: Access Vercel Storage
1. Go to **https://vercel.com/dashboard**
2. Look for the **Storage** tab (top navigation)
3. Click on **Storage**

### Step 2: Create PostgreSQL Database
1. Click **"Create Database"** button
2. Select **"PostgreSQL"** from the options
3. Fill in details:
   - **Name:** `fortress-optimizer` (or any name)
   - **Region:** Select closest to your location (or us-east-1)
   - **Project:** fortress-optimizer-monorepo
4. Click **"Create"**

### Step 3: Get Connection String
1. After creation, you'll see your database listed
2. Click on the database name
3. Go to the **".env.local"** tab
4. Copy the entire `POSTGRES_URL_NON_POOLING` value
5. It will look like:
   ```
   postgresql://user:password@host:5432/fortress-optimizer
   ```

### Step 4: Add to Vercel Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Set:
   - **Name:** `DATABASE_URL`
   - **Value:** Paste the connection string from step 3
   - **Environments:** Select `Production`, `Preview`, and `Development`
4. Click **"Add"**

### Step 5: Deploy & Run Migrations
1. In your terminal:
   ```bash
   cd /Users/diawest/projects/fortress-optimizer-monorepo/website
   npx prisma migrate deploy
   ```
2. This creates all tables in production PostgreSQL
3. If no migrations exist, run:
   ```bash
   npx prisma db push
   ```

---

## Option B: AWS RDS (More Control)

### Step 1: Create RDS Instance
1. Go to **https://console.aws.amazon.com/rds**
2. Click **"Create database"**
3. Select **PostgreSQL** (version 14 or higher)
4. Choose:
   - **DB instance identifier:** `fortress-optimizer`
   - **Master username:** `postgres`
   - **Master password:** (generate strong password - save it!)
   - **DB instance class:** `db.t3.micro` (free tier eligible)
   - **Storage:** 20 GB (free tier)

### Step 2: Configure Network
1. In **Connectivity** section:
   - **VPC:** Select default VPC
   - **Public accessibility:** YES (for Vercel to connect)
2. In **Security group:** Create new or select existing
3. Go to Security Group settings
4. Add **Inbound Rule:**
   - Type: PostgreSQL
   - Port: 5432
   - Source: 0.0.0.0/0 (or Vercel IP)
5. Click **Create database**

### Step 3: Wait for Creation
- Takes about 5-10 minutes
- Status changes from "Creating" to "Available"

### Step 4: Get Connection Details
1. Click on your database name
2. Find the **"Endpoint"** section
3. Copy the endpoint (looks like `fortress-optimizer.xxxxx.us-east-1.rds.amazonaws.com`)
4. Build connection string:
   ```
   postgresql://postgres:YOUR_PASSWORD@fortress-optimizer.xxxxx.us-east-1.rds.amazonaws.com:5432/postgres
   ```

### Step 5: Create Database
1. Connect using PostgreSQL client or online tool
2. Run:
   ```sql
   CREATE DATABASE fortress;
   ```
3. Update connection string to use `fortress` database

### Step 6: Add to Vercel
1. Go to **Settings** → **Environment Variables**
2. Add `DATABASE_URL` with your connection string

### Step 7: Run Migrations
```bash
npx prisma migrate deploy
```

---

## Option C: DigitalOcean (Middle Ground)

### Step 1: Create Database Cluster
1. Go to **https://cloud.digitalocean.com**
2. Click **"Create"** → **"Databases"**
3. Select **PostgreSQL**
4. Choose:
   - **Size:** Basic (cheapest)
   - **Nodes:** 1
   - **Region:** Closest to you

### Step 2: Get Connection String
1. After creation, click on your database
2. Go to **"Connection Details"** tab
3. Copy the **"Connection string"** (it's already formatted)
4. Should look like:
   ```
   postgresql://doadmin:xxxx@db-xxx.a.db.ondigitalocean.com:25061/defaultdb?sslmode=require
   ```

### Step 3: Add to Vercel
1. Settings → Environment Variables
2. Add `DATABASE_URL` with the connection string

### Step 4: Run Migrations
```bash
npx prisma migrate deploy
```

---

## Option D: Neon (Free Tier - Developer Friendly)

### Step 1: Sign Up
1. Go to **https://neon.tech**
2. Click **"Sign Up"**
3. Use GitHub or Email

### Step 2: Create Project
1. Click **"Create a new project"**
2. Select **PostgreSQL**
3. Name it `fortress-optimizer`
4. Click **Create project**

### Step 3: Get Connection String
1. In your project, click **"Connection string"**
2. Copy the **"Nodejs"** connection string
3. It will look like:
   ```
   postgresql://user:password@xxx.neon.tech/fortress?sslmode=require
   ```

### Step 4: Add to Vercel
1. Settings → Environment Variables
2. Add `DATABASE_URL` with connection string

### Step 5: Run Migrations
```bash
npx prisma migrate deploy
```

---

## Complete Step-by-Step for Vercel Postgres (Recommended)

### Total Time: 15-20 minutes

### Step 1: Open Vercel Dashboard (2 min)
```
1. Go to https://vercel.com/dashboard
2. Find "Storage" in top navigation
3. Click "Storage"
```

### Step 2: Create Database (2 min)
```
1. Click "Create Database"
2. Select "PostgreSQL"
3. Database Name: fortress-optimizer
4. Region: us-east-1 (or your region)
5. Project: fortress-optimizer-monorepo
6. Click "Create"
```

### Step 3: Copy Connection String (2 min)
```
1. Wait for "Available" status (refresh if needed)
2. Click database name
3. Go to ".env.local" tab
4. Copy POSTGRES_URL_NON_POOLING value
5. Save it somewhere temporarily
```

### Step 4: Add to Vercel Environment Variables (3 min)
```
1. Go to "Settings" tab (same level as Storage)
2. Click "Environment Variables"
3. Click "Add New"
4. Key: DATABASE_URL
5. Value: Paste connection string
6. Environments: ✓ Production ✓ Preview ✓ Development
7. Click "Add"
```

### Step 5: Update Local .env (2 min)
```bash
cd /Users/diawest/projects/fortress-optimizer-monorepo/website
echo 'DATABASE_URL=postgresql://...(your connection string)...' >> .env.local
```

### Step 6: Run Migrations (5 min)
```bash
npx prisma migrate deploy
```

Output should show:
```
✔ Successfully ran 1 migration
```

### Step 7: Verify (2 min)
```bash
npx prisma db execute --stdin < /dev/null
```

Should connect successfully (no error = good!)

---

## Troubleshooting

### "Too many connections" error
- Vercel Postgres has connection limits
- Solution: Use **POSTGRES_URL_NON_POOLING** for migrations
- Use **POSTGRES_URL** for app (has connection pooling)

### "SSL certificate problem"
- Add `?sslmode=require` to connection string
- Some providers do this automatically

### "Connection refused"
- Check if security group allows port 5432
- Verify database is in "Available" status
- Check connection string is correct

### "Migrations failed"
```bash
# Reset database (loses all data!)
npx prisma migrate reset

# Or manually check schema
npx prisma db push
```

---

## After Database Setup

### Quick Test
```bash
npx prisma db execute --stdin << EOF
SELECT * FROM "User" LIMIT 1;
EOF
```

### Seed Initial Data (Optional)
```bash
npx prisma db seed
```

### View Database in GUI
```bash
npx prisma studio
```

---

## Environment Variables Summary

After setup, your Vercel environment should have:

| Variable | Example | Status |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://...` | ✅ Just added |
| `JWT_SECRET` | `d2fc839798...` | ✅ Add if not set |
| `NEXTAUTH_SECRET` | `8c1a06db2d...` | ✅ Add if not set |
| `NEXTAUTH_URL` | `https://fortress-optimizer.com` | ✅ Should be set |
| `RESEND_API_KEY` | `re_8FqPAC...` | ✅ Already set |
| `FROM_EMAIL` | `noreply@fortress-optimizer.com` | ✅ Already set |

---

## When Complete

Once migrations run successfully:
1. ✅ PostgreSQL database created
2. ✅ All tables created (User, Email, EmailReply, Settings)
3. ✅ Indexes created
4. ✅ Ready for production use
5. ✅ Can start signing up users

Next: Test authentication flow!

