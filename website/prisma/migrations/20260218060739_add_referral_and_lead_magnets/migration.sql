-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "completedAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_count_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "originalTokens" INTEGER NOT NULL,
    "optimizedTokens" INTEGER NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "promptText" TEXT,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_count_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_calculator_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tokensPerDay" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "optimizedCost" DOUBLE PRECISION NOT NULL,
    "monthlySavings" DOUBLE PRECISION NOT NULL,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_calculator_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_checker_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "codeLocation" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teamSize" TEXT NOT NULL,
    "recommendedPlatforms" TEXT[],
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compatibility_checker_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_userId_idx" ON "referral_codes"("userId");

-- CreateIndex
CREATE INDEX "referral_codes_code_idx" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_refereeId_idx" ON "referrals"("refereeId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "token_count_usages_userId_idx" ON "token_count_usages"("userId");

-- CreateIndex
CREATE INDEX "token_count_usages_sessionId_idx" ON "token_count_usages"("sessionId");

-- CreateIndex
CREATE INDEX "token_count_usages_createdAt_idx" ON "token_count_usages"("createdAt");

-- CreateIndex
CREATE INDEX "cost_calculator_usages_userId_idx" ON "cost_calculator_usages"("userId");

-- CreateIndex
CREATE INDEX "cost_calculator_usages_sessionId_idx" ON "cost_calculator_usages"("sessionId");

-- CreateIndex
CREATE INDEX "cost_calculator_usages_createdAt_idx" ON "cost_calculator_usages"("createdAt");

-- CreateIndex
CREATE INDEX "compatibility_checker_usages_userId_idx" ON "compatibility_checker_usages"("userId");

-- CreateIndex
CREATE INDEX "compatibility_checker_usages_sessionId_idx" ON "compatibility_checker_usages"("sessionId");

-- CreateIndex
CREATE INDEX "compatibility_checker_usages_createdAt_idx" ON "compatibility_checker_usages"("createdAt");

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
