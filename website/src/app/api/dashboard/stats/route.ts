/**
 * Dashboard Stats API — REAL usage data per user
 * GET /api/dashboard/stats?range=7d
 *
 * Returns actual optimization metrics from the database,
 * NOT hardcoded mock data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/jwt-auth';
import { PRICING } from '@/lib/pricing-config';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const range = request.nextUrl.searchParams.get('range') || '7d';
    const daysMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[range] || 7;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get real optimization data from TokenCountUsage
    const optimizations = await prisma.tokenCountUsage.findMany({
      where: {
        userId: auth.id,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        originalTokens: true,
        optimizedTokens: true,
        savings: true,
        createdAt: true,
      },
    });

    // Get optimization events
    const events = await prisma.event.findMany({
      where: {
        userId: auth.id,
        eventName: 'optimization_completed',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate real totals
    const totalOriginalTokens = optimizations.reduce((sum, o) => sum + o.originalTokens, 0);
    const totalOptimizedTokens = optimizations.reduce((sum, o) => sum + o.optimizedTokens, 0);
    const totalTokensSaved = totalOriginalTokens - totalOptimizedTokens;
    const avgSavingsPercent = optimizations.length > 0
      ? optimizations.reduce((sum, o) => sum + o.savings, 0) / optimizations.length
      : 0;
    const costSaved = totalTokensSaved > 0
      ? (totalTokensSaved / 1000) * 0.003 // $0.003 per 1K tokens
      : 0;

    // Group by day for chart data
    const dailyMap = new Map<string, { original: number; optimized: number }>();
    for (const opt of optimizations) {
      const dayKey = opt.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dayKey) || { original: 0, optimized: 0 };
      existing.original += opt.originalTokens;
      existing.optimized += opt.optimizedTokens;
      dailyMap.set(dayKey, existing);
    }

    const dailyData = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
      original: data.original,
      optimized: data.optimized,
    }));

    // Get user's tier
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { tier: true },
    });

    const hasData = optimizations.length > 0;

    return NextResponse.json({
      hasData,
      range,
      totalTokens: totalOriginalTokens,
      tokensOptimized: totalOptimizedTokens,
      tokensSaved: totalTokensSaved,
      costSaved: Math.round(costSaved * 100) / 100,
      avgSavingsPercent: Math.round(avgSavingsPercent * 10) / 10,
      optimizationCount: optimizations.length,
      dailyData,
      tier: user?.tier || 'free',
      // Empty state messaging
      emptyStateMessage: hasData ? null : 'No optimizations yet. Send your first prompt to see real savings here.',
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard stats', hasData: false },
      { status: 500 }
    );
  }
}
