-- Account-gated free tier: one free API key per user.
-- freeKeyClaimedAt is the source of truth for "already claimed";
-- freeKeyHash stores a SHA256 of the issued key (never the raw secret).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "freeKeyClaimedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "freeKeyHash" TEXT;
