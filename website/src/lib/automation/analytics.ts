// Analytics utilities
// File: src/lib/automation/analytics.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate conversion funnel metrics
 */
export async function calculateConversionFunnel(source: string) {
  const signups = await prisma.userSignup.findMany({ where: { source } });
  const firstAction = signups.filter(s => s.firstActionAt !== null);
  const converted = signups.filter(s => s.convertedAt !== null);

  const total = signups.length;
  const signupRate = (firstAction.length / total) * 100 || 0;
  const conversionRate = (converted.length / firstAction.length) * 100 || 0;

  return {
    source,
    total,
    firstAction: firstAction.length,
    converted: converted.length,
    signupRate: parseFloat(signupRate.toFixed(2)),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
  };
}

/**
 * Get user cohort analysis
 */
export async function getCohortAnalysis(cohortName: string) {
  const cohort = await prisma.userCohort.findUnique({
    where: { name: cohortName },
  });

  if (!cohort) return null;

  return {
    name: cohort.name,
    totalUsers: cohort.totalUsers,
    metrics: {
      retention: {
        day1: cohort.retention1Day,
        day7: cohort.retention7Day,
        day30: cohort.retention30Day,
      },
      churnRate: ((cohort.churnedUsers / cohort.totalUsers) * 100).toFixed(2),
      paidConversion: ((cohort.paidUsers / cohort.totalUsers) * 100).toFixed(2),
    },
  };
}

/**
 * Create daily metrics snapshot
 */
export async function createMetricsSnapshot() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get signups from last 24 hours
  const newSignups = await prisma.userSignup.count({
    where: {
      createdAt: {
        gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      },
    },
  });

  // Get total signups
  const totalSignups = await prisma.userSignup.count();

  // Get active users (users who did an action in last 7 days)
  const activeUsers = await prisma.event.findMany({
    where: {
      createdAt: {
        gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: { userId: true },
  });
  const uniqueActiveUsers = new Set(
    activeUsers.map(e => e.userId).filter(Boolean)
  ).size;

  // Get optimizations completed
  const optimizationsCompleted = await prisma.event.count({
    where: {
      eventName: 'first_optimization_completed',
      createdAt: {
        gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      },
    },
  });

  // Create snapshot
  const snapshot = await prisma.metricsSnapshot.upsert({
    where: { date: today },
    update: {
      newSignups,
      totalSignups,
      activeUsers: uniqueActiveUsers,
      optimizationsCompleted,
    },
    create: {
      date: today,
      newSignups,
      totalSignups,
      activeUsers: uniqueActiveUsers,
      optimizationsCompleted,
    },
  });

  return snapshot;
}

/**
 * Calculate channel ROI
 */
export async function calculateChannelRoi() {
  const sources = await prisma.userSignup.groupBy({
    by: ['source'],
    _count: { id: true },
  });

  return sources.map(s => ({
    source: s.source,
    signups: s._count.id,
    // Assuming fixed cost per channel (would be configurable)
    estimatedCost: s._count.id * 5, // $5 per signup
    // Assuming $100 LTV per paid customer
    estimatedRevenue: (s._count.id * 0.15) * 100, // 15% conversion rate
  }));
}

/**
 * Get funnel drop-off analysis
 */
export async function getFunnelDropoffAnalysis(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const signups = await prisma.userSignup.count({
    where: { createdAt: { gte: startDate } },
  });

  const verified = await prisma.userSignup.count({
    where: {
      createdAt: { gte: startDate },
      conversionStatus: { not: 'signup' },
    },
  });

  const firstAction = await prisma.userSignup.count({
    where: {
      createdAt: { gte: startDate },
      conversionStatus: { in: ['first_action', 'converted_paid'] },
    },
  });

  const converted = await prisma.userSignup.count({
    where: {
      createdAt: { gte: startDate },
      conversionStatus: 'converted_paid',
    },
  });

  return {
    period: `Last ${days} days`,
    funnel: [
      { stage: 'Signups', count: signups, percentage: 100 },
      { stage: 'Verified', count: verified, percentage: (verified / signups) * 100 },
      { stage: 'First Action', count: firstAction, percentage: (firstAction / signups) * 100 },
      { stage: 'Converted', count: converted, percentage: (converted / signups) * 100 },
    ],
  };
}

/**
 * Generate analytics report
 */
export async function generateAnalyticsReport(dateRange = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const snapshots = await prisma.metricsSnapshot.findMany({
    where: {
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  });

  const funnelAnalysis = await getFunnelDropoffAnalysis(dateRange);
  const channelRoi = await calculateChannelRoi();

  return {
    dateRange: {
      start: startDate,
      end: new Date(),
    },
    summary: {
      totalSignups: snapshots[snapshots.length - 1]?.totalSignups || 0,
      newSignups: snapshots.reduce((sum, s) => sum + s.newSignups, 0),
      activeUsers: Math.max(...snapshots.map(s => s.activeUsers)),
      optimizationsCompleted: snapshots.reduce((sum, s) => sum + s.optimizationsCompleted, 0),
    },
    funnel: funnelAnalysis,
    channels: channelRoi,
    snapshots,
  };
}
