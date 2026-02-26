-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "user_signups" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaign" TEXT,
    "medium" TEXT,
    "content" TEXT,
    "referrer" TEXT,
    "referrerUserId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "conversionStatus" TEXT NOT NULL DEFAULT 'signup',
    "firstActionAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "eventName" TEXT NOT NULL,
    "eventData" JSONB,
    "source" TEXT,
    "page" TEXT,
    "referrer" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_funnels" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "signupCount" INTEGER NOT NULL DEFAULT 0,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "churnCount" INTEGER NOT NULL DEFAULT 0,
    "signupRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversion_funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_snapshots" (
    "id" TEXT NOT NULL,
    "newSignups" INTEGER NOT NULL DEFAULT 0,
    "totalSignups" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "optimizationsCompleted" INTEGER NOT NULL DEFAULT 0,
    "paidUsers" INTEGER NOT NULL DEFAULT 0,
    "mrrAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "churnedUsers" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "plainBody" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails_sent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_sent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_variants" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocationPercentage" INTEGER NOT NULL DEFAULT 50,
    "changes" JSONB NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_assignments" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cohorts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "signupSource" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signupDateStart" TIMESTAMP(3),
    "signupDateEnd" TIMESTAMP(3),
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "paidUsers" INTEGER NOT NULL DEFAULT 0,
    "churnedUsers" INTEGER NOT NULL DEFAULT 0,
    "retention1Day" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retention7Day" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retention30Day" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_media_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "link" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_media_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "hour" INTEGER NOT NULL DEFAULT 9,
    "recipients" TEXT[],
    "sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "automationType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "metadata" JSONB,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_signups_userId_key" ON "user_signups"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_signups_email_key" ON "user_signups"("email");

-- CreateIndex
CREATE INDEX "user_signups_source_idx" ON "user_signups"("source");

-- CreateIndex
CREATE INDEX "user_signups_campaign_idx" ON "user_signups"("campaign");

-- CreateIndex
CREATE INDEX "user_signups_conversionStatus_idx" ON "user_signups"("conversionStatus");

-- CreateIndex
CREATE INDEX "user_signups_createdAt_idx" ON "user_signups"("createdAt");

-- CreateIndex
CREATE INDEX "events_userId_idx" ON "events"("userId");

-- CreateIndex
CREATE INDEX "events_email_idx" ON "events"("email");

-- CreateIndex
CREATE INDEX "events_eventName_idx" ON "events"("eventName");

-- CreateIndex
CREATE INDEX "events_source_idx" ON "events"("source");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_funnels_source_key" ON "conversion_funnels"("source");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_snapshots_date_key" ON "metrics_snapshots"("date");

-- CreateIndex
CREATE INDEX "metrics_snapshots_date_idx" ON "metrics_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_sequenceId_order_key" ON "email_templates"("sequenceId", "order");

-- CreateIndex
CREATE INDEX "emails_sent_email_idx" ON "emails_sent"("email");

-- CreateIndex
CREATE INDEX "emails_sent_status_idx" ON "emails_sent"("status");

-- CreateIndex
CREATE INDEX "emails_sent_sentAt_idx" ON "emails_sent"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_published_idx" ON "blog_posts"("published");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_variants_experimentId_name_key" ON "experiment_variants"("experimentId", "name");

-- CreateIndex
CREATE INDEX "experiment_assignments_experimentId_idx" ON "experiment_assignments"("experimentId");

-- CreateIndex
CREATE INDEX "experiment_assignments_userId_idx" ON "experiment_assignments"("userId");

-- CreateIndex
CREATE INDEX "experiment_assignments_sessionId_idx" ON "experiment_assignments"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_cohorts_name_key" ON "user_cohorts"("name");

-- CreateIndex
CREATE INDEX "social_media_campaigns_platform_idx" ON "social_media_campaigns"("platform");

-- CreateIndex
CREATE INDEX "social_media_campaigns_status_idx" ON "social_media_campaigns"("status");

-- CreateIndex
CREATE INDEX "automation_logs_automationType_idx" ON "automation_logs"("automationType");

-- CreateIndex
CREATE INDEX "automation_logs_status_idx" ON "automation_logs"("status");

-- CreateIndex
CREATE INDEX "automation_logs_executedAt_idx" ON "automation_logs"("executedAt");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "email_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
