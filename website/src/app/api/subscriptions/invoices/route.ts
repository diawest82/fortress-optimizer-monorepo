/**
 * GET /api/subscriptions/invoices
 * Fetches invoice history from Stripe for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
