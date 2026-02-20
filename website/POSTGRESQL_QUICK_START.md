# PostgreSQL Setup - Quick Start (5 Minutes)

## For Vercel Postgres (Recommended)

### 1. Create Database
```
https://vercel.com/dashboard → Storage → Create Database → PostgreSQL
- Name: fortress-optimizer
- Region: us-east-1
```

### 2. Copy Connection String
```
Click database → .env.local tab → Copy POSTGRES_URL_NON_POOLING
```

### 3. Add to Vercel
```
Settings → Environment Variables → Add New
Key: DATABASE_URL
Value: (paste connection string)
Environments: Production, Preview, Development
```

### 4. Run Migrations
```bash
npx prisma migrate deploy
```

### 5. Done! ✅
Tables created automatically in PostgreSQL

---

## For AWS RDS (More Control)

```
1. https://console.aws.amazon.com/rds → Create database
2. PostgreSQL, db.t3.micro, public access enabled
3. Security group: Allow port 5432 from 0.0.0.0/0
4. Get endpoint: fortress-optimizer.xxxxx.us-east-1.rds.amazonaws.com
5. Build connection: postgresql://postgres:PASSWORD@endpoint:5432/fortress
6. Add DATABASE_URL to Vercel
7. npx prisma migrate deploy
```

---

## For DigitalOcean (Middle Ground)

```
1. https://cloud.digitalocean.com → Create → Databases → PostgreSQL
2. Copy connection string from Connection Details
3. Add DATABASE_URL to Vercel
4. npx prisma migrate deploy
```

---

## For Neon (Free, No Credit Card)

```
1. https://neon.tech → Sign up → Create project
2. Copy Nodejs connection string
3. Add DATABASE_URL to Vercel
4. npx prisma migrate deploy
```

---

## What Gets Created

Automatically after `npx prisma migrate deploy`:

```
Tables:
  ✓ User (admin accounts)
  ✓ Email (incoming emails)
  ✓ EmailReply (draft replies)
  ✓ Settings (config)

Indexes:
  ✓ email unique
  ✓ createdAt, status timestamps
  ✓ Foreign key relationships
```

---

## Test It Works

```bash
npx prisma studio
# Opens GUI at http://localhost:5555
# Shows all tables and data
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused | Verify security group allows 5432 |
| SSL error | Add `?sslmode=require` to URL |
| Too many connections | Use POSTGRES_URL_NON_POOLING for CLI |
| Migrations failed | Check DATABASE_URL is correct |

---

## Summary

**Easiest:** Vercel Postgres (integrated, no setup)
**Most Control:** AWS RDS (customizable, paid)
**Best Free:** Neon (generous free tier)
**Middle:** DigitalOcean (managed, affordable)

All work the same way with Prisma!

