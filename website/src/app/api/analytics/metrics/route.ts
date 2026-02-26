// API route for getting analytics metrics
// File: src/app/api/analytics/metrics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const source = searchParams.get('source');
    const includeToolSavings = searchParams.get('includeToolSavings') !== 'false';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get signup metrics
    const signupsBySource = await prisma.userSignup.groupBy({
      by: ['source'],
      _count: { id: true },
      where: source ? { source } : { createdAt: { gte: startDate } },
    });

    // Get conversion metrics
    const conversionMetrics = await prisma.userSignup.groupBy({
      by: ['conversionStatus'],
      _count: { id: true },
      where: { createdAt: { gte: startDate } },
    });

    // Get event metrics
    const eventMetrics = await prisma.event.groupBy({
      by: ['eventName'],
      _count: { id: true },
      where: { createdAt: { gte: startDate } },
    });

    // Get conversion funnel for each source
    const funnels = await prisma.conversionFunnel.findMany(
      source ? { where: { source } } : undefined
    );

    // Get latest metrics snapshot
    const latestSnapshot = await prisma.metricsSnapshot.findFirst({
      orderBy: { date: 'desc' },
    });

    let toolSavingsBySource: Array<{
      source: string;
      tokensBefore: number;
      tokensAfter: number;
      tokensSaved: number;
      costSavedUSD: number;
      events: number;
    }> = [];

    if (includeToolSavings) {
      const toolEvents = await prisma.event.findMany({
        where: {
          eventName: 'optimization_completed',
          createdAt: { gte: startDate },
          ...(source ? { source } : {}),
        },
        select: { source: true, eventData: true },
      });

      const aggregate = new Map<string, {
        tokensBefore: number;
        tokensAfter: number;
        tokensSaved: number;
        costSavedUSD: number;
        events: number;
      }>();

      for (const event of toolEvents) {
        const key = event.source || 'unknown';
        const data = (event.eventData || {}) as Record<string, any>;
        const tokensBefore = Number(data.tokensBefore ?? data.originalTokens ?? 0);
        const tokensAfter = Number(data.tokensAfter ?? data.optimizedTokens ?? 0);
        const tokensSaved = Number(
          data.tokensSaved ?? (tokensBefore > 0 ? Math.max(tokensBefore - tokensAfter, 0) : 0)
        );
        const costSavedUSD = Number(data.costSavedUSD ?? data.costSavings ?? 0);

        const current = aggregate.get(key) || {
          tokensBefore: 0,
          tokensAfter: 0,
          tokensSaved: 0,
          costSavedUSD: 0,
          events: 0,
        };

        current.tokensBefore += tokensBefore;
        current.tokensAfter += tokensAfter;
        current.tokensSaved += tokensSaved;
        current.costSavedUSD += costSavedUSD;
        current.events += 1;
        aggregate.set(key, current);
      }

      toolSavingsBySource = Array.from(aggregate.entries()).map(([toolSource, stats]) => ({
        source: toolSource,
        ...stats,
      }));
    }

    return NextResponse.json({
      signupsBySource,
      conversionMetrics,
      eventMetrics,
      funnels,
      latestSnapshot,
      toolSavingsBySource,
      dateRange: { startDate, endDate: new Date() },
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
