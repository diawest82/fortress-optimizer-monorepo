/**
 * Upgrade Subscription
 * POST /api/subscriptions/upgrade
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newTier } = await req.json();
    const validTiers = ['starter', 'growth', 'enterprise'];

    if (!validTiers.includes(newTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    return NextResponse.json({
      message: `Upgraded to ${newTier}`,
      tier: newTier,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upgrade subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
