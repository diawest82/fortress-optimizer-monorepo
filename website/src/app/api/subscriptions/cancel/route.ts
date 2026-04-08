/**
 * Cancel Subscription
 * POST /api/subscriptions/cancel
 *
 * History: this used to accept any "Bearer ..." header value as proof of
 * authentication — no actual JWT verification. Caught by 83-auth-pattern-guard
 * as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Still a stub: doesn't actually call Stripe to cancel. The auth gap is fixed;
 * the cancellation logic remains a TODO.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/jwt-auth';

export async function POST(req: NextRequest) {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // TODO: actually cancel the user's Stripe subscription via stripe.subscriptions.update
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
