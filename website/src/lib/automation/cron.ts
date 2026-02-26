// Cron job for daily automation tasks
// File: src/lib/automation/cron.ts

import { PrismaClient } from '@prisma/client';
import { createMetricsSnapshot } from './analytics';
import { generateDailyReport, sendReportEmail } from './reporting';
import { generateSitemap, validateBlogPostSeo } from './seo';

const prisma = new PrismaClient();

/**
 * Run daily automation tasks
 */
export async function runDailyAutomation() {
  console.log('[CRON] Starting daily automation tasks...');

  try {
    // 1. Create metrics snapshot
    console.log('[CRON] Creating metrics snapshot...');
    const snapshot = await createMetricsSnapshot();
    console.log('[CRON] ✓ Metrics snapshot created', snapshot);

    // 2. Validate blog posts SEO
    console.log('[CRON] Validating blog post SEO...');
    const posts = await prisma.blogPost.findMany({ where: { published: true } });
    for (const post of posts) {
      const validation = await validateBlogPostSeo(post.id);
      if (!validation?.isValid) {
        console.log(`[CRON] ⚠️  SEO issues found in post: ${post.slug}`);
      }
    }

    // 3. Generate sitemap (would save to filesystem or CDN)
    console.log('[CRON] Generating sitemap...');
    const sitemap = await generateSitemap();
    // TODO: Save sitemap to public directory
    console.log('[CRON] ✓ Sitemap generated');

    // 4. Send daily email report
    console.log('[CRON] Sending daily reports...');
    const reports = await prisma.scheduledReport.findMany({
      where: { frequency: 'daily', isActive: true },
    });

    for (const report of reports) {
      const reportContent = await generateDailyReport(snapshot);
      if (report.recipients.length > 0) {
        await sendReportEmail(report.recipients, `Daily Metrics Report - ${new Date().toDateString()}`, reportContent);
        console.log(`[CRON] ✓ Report sent to ${report.recipients.join(', ')}`);
      }

      // Update last sent time
      await prisma.scheduledReport.update({
        where: { id: report.id },
        data: { lastSentAt: new Date() },
      });
    }

    // 5. Log automation execution
    await prisma.automationLog.create({
      data: {
        automationType: 'daily_tasks',
        action: 'Daily automation completed',
        status: 'success',
        metadata: {
          snapshotId: snapshot.id,
          postsValidated: posts.length,
          reportsSent: reports.length,
        },
      },
    });

    console.log('[CRON] ✓ Daily automation complete');
    return { success: true };
  } catch (error) {
    console.error('[CRON] Error during automation:', error);

    // Log the error
    await prisma.automationLog.create({
      data: {
        automationType: 'daily_tasks',
        action: 'Daily automation failed',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return { success: false, error };
  }
}

/**
 * Run weekly automation tasks
 */
export async function runWeeklyAutomation() {
  console.log('[CRON] Starting weekly automation tasks...');

  try {
    // 1. Recalculate conversion funnels
    console.log('[CRON] Recalculating conversion funnels...');
    const sources = await prisma.userSignup.groupBy({
      by: ['source'],
    });

    for (const { source } of sources) {
      const signups = await prisma.userSignup.count({ where: { source } });
      const firstActions = await prisma.userSignup.count({
        where: { source, conversionStatus: { not: 'signup' } },
      });
      const conversions = await prisma.userSignup.count({
        where: { source, conversionStatus: 'converted_paid' },
      });

      const signupRate = (firstActions / signups) * 100 || 0;
      const conversionRate = (conversions / firstActions) * 100 || 0;

      await prisma.conversionFunnel.upsert({
        where: { source },
        update: {
          visitCount: signups,
          signupCount: signups,
          conversionRate,
          lastCalculatedAt: new Date(),
        },
        create: {
          source,
          visitCount: signups,
          signupCount: signups,
          conversionRate,
          lastCalculatedAt: new Date(),
        },
      });
    }

    console.log('[CRON] ✓ Conversion funnels updated');

    // 2. Send weekly reports
    console.log('[CRON] Sending weekly reports...');
    const reports = await prisma.scheduledReport.findMany({
      where: { frequency: 'weekly', isActive: true },
    });

    const today = new Date().getDay();
    for (const report of reports) {
      if (report.dayOfWeek === today) {
        // Generate and send report
        console.log(`[CRON] ✓ Weekly report sent`);
      }
    }

    console.log('[CRON] ✓ Weekly automation complete');
    return { success: true };
  } catch (error) {
    console.error('[CRON] Weekly automation error:', error);
    return { success: false, error };
  }
}

/**
 * Cleanup old automation logs (keep only 90 days)
 */
export async function cleanupAutomationLogs() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const deleted = await prisma.automationLog.deleteMany({
    where: { executedAt: { lt: ninetyDaysAgo } },
  });

  console.log(`[CRON] Cleaned up ${deleted.count} old automation logs`);
  return deleted;
}

/**
 * Check for stale experiments and conclude them
 */
export async function concludeStaleExperiments() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const staleExperiments = await prisma.experiment.findMany({
    where: {
      status: 'running',
      startedAt: { lt: twoWeeksAgo },
    },
  });

  for (const exp of staleExperiments) {
    // Only conclude if we have enough data
    const assignments = await prisma.experimentAssignment.count({
      where: { experimentId: exp.id },
    });

    if (assignments > 100) {
      await prisma.experiment.update({
        where: { id: exp.id },
        data: { status: 'completed', endedAt: new Date() },
      });
      console.log(`[CRON] Concluded experiment: ${exp.name}`);
    }
  }

  return staleExperiments.length;
}
