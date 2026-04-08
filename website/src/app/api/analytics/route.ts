/**
 * Analytics API Endpoint
 *
 * POST /api/analytics — public ingest (clients fire-and-forget events).
 *   Intentionally unauthenticated. Stored in-memory; not personally identifiable.
 *
 * GET  /api/analytics — admin-only summary.
 *   Aggregated event counts. Requires admin role.
 *
 * History: GET used to be public, returning aggregated business metrics
 * (signups, checkouts, conversion rates) to anyone who hit the URL. Caught
 * by 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

interface AnalyticsEvent {
  userId?: string;
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: Date;
}

// In-memory analytics storage (in production, use a real database)
const analyticsStore: AnalyticsEvent[] = [];

export async function POST(req: NextRequest) {
  try {
    const { events } = await req.json() as { events: AnalyticsEvent[] };

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events must be an array' },
        { status: 400 }
      );
    }

    // Store analytics events
    analyticsStore.push(...events.map(e => ({
      ...e,
      timestamp: e.timestamp || new Date(),
    })));

    // Log critical events
    const criticalEvents = events.filter(e => 
      ['signup_completed', 'checkout_completed', 'optimization_completed'].includes(e.event)
    );

    if (criticalEvents.length > 0) {
      console.log(`[Analytics] ${criticalEvents.length} critical events recorded:`, criticalEvents);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${events.length} analytics events`,
      stored: analyticsStore.length,
    });
  } catch (error) {
    console.error('POST /api/analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics events' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics - Get analytics summary (admin-only)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    // Aggregate event counts
    const eventCounts: Record<string, number> = {};
    analyticsStore.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });

    // Get top events
    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));

    // Get events from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = analyticsStore.filter(e => 
      e.timestamp && e.timestamp > oneDayAgo
    );

    return NextResponse.json({
      success: true,
      totalEvents: analyticsStore.length,
      eventCounts,
      topEvents,
      eventsLast24h: recentEvents.length,
      completionRate: {
        signups: eventCounts['signup_completed'] || 0,
        checkouts: eventCounts['checkout_completed'] || 0,
        optimizations: eventCounts['optimization_completed'] || 0,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
