-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "html" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "category" TEXT,
    "isEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "companySize" INTEGER,
    "aiSummary" TEXT,
    "aiRecommendation" TEXT,
    "requiresHuman" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "email_replies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "html" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "email_replies_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "email_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enterpriseThreshold" INTEGER NOT NULL DEFAULT 999,
    "autoResponseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultAutoResponse" TEXT,
    "notifyOnEnterprise" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "emails_status_idx" ON "emails"("status");

-- CreateIndex
CREATE INDEX "emails_isEnterprise_idx" ON "emails"("isEnterprise");

-- CreateIndex
CREATE INDEX "emails_timestamp_idx" ON "emails"("timestamp");

-- CreateIndex
CREATE INDEX "email_replies_emailId_idx" ON "email_replies"("emailId");
