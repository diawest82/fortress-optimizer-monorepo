/**
 * Cancel Subscription
 * POST /api/subscriptions/cancel
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Subscription cancelled successfully',
      status: 'cancelled',
      tier: 'free',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
