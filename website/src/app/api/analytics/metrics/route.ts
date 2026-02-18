// API route for getting analytics metrics
// File: src/app/api/analytics/metrics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const source = searchParams.get('source');

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

    return NextResponse.json({
      signupsBySource,
      conversionMetrics,
      eventMetrics,
      funnels,
      latestSnapshot,
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
