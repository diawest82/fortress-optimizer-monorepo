/**
 * Downgrade Subscription
 * POST /api/subscriptions/downgrade
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newTier } = await req.json();
    const validTiers = ['free', 'starter', 'growth'];

    if (!validTiers.includes(newTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    return NextResponse.json({
      message: `Downgraded to ${newTier}`,
      tier: newTier,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to downgrade subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
