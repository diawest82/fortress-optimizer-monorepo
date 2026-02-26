-- Add missing billingCycleDay column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billingCycleDay" INTEGER NOT NULL DEFAULT 1;
