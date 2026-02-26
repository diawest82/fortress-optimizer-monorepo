-- Backfill missing columns on users table to match Prisma schema
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "billingCycleDay" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "teamId" TEXT,
  ADD COLUMN IF NOT EXISTS "accountManager" TEXT,
  ADD COLUMN IF NOT EXISTS "slaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supportLevel" TEXT NOT NULL DEFAULT 'community';
