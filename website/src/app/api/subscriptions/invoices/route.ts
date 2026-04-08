/**
 * GET /api/subscriptions/invoices
 * Fetches Stripe invoice history for the AUTHENTICATED user.
 *
 * History: this used to read userId from an `x-user-id` request header
 * (no signature, fully spoofable) and look up that user's invoices.
 * Anyone could read anyone else's billing history. Caught by
 * 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Note: this is the same vulnerability class as the `x-user-context` header
 * the first test in 83-auth-pattern-guard explicitly bans — `x-user-id`
 * just dodged that test by being a different name. We should add `x-user-id`
 * to that ban list as a follow-up.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/jwt-auth';

export async function GET(req: NextRequest) {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ invoices: [] });
    }

    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 12,
    });

    const invoices = stripeInvoices.data.map((inv) => ({
      date: new Date((inv.created || 0) * 1000).toISOString(),
      amount: inv.amount_paid || 0,
      status: inv.status || 'unknown',
      invoiceUrl: inv.hosted_invoice_url || undefined,
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('GET /api/subscriptions/invoices error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
