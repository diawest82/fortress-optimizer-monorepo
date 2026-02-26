/**
 * Subscriptions API
 * GET /api/subscriptions - Get current user subscription
 * POST /api/subscriptions - Create checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getCustomerSubscription, PRICING_TIERS, stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';

function getTierFeatures(tier: string) {
  const features: Record<string, string[]> = {
    free: ['50K tokens/month', 'All 5 integration channels', 'Basic metrics dashboard', 'Community support'],
    individual: ['500K tokens/month', 'All 5 integration channels', 'Real-time optimization', 'Advanced analytics', 'Email support', 'API access'],
    teams: ['Unlimited tokens', 'Team seat management', 'Advanced analytics', 'Priority support', 'Slack integration'],
    enterprise: ['Unlimited everything', 'Custom integrations', 'Dedicated account manager', '24/7 priority support'],
  };
  return features[tier] || features.free;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer ID from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true },
    });

    if (!user?.stripeCustomerId) {
      // Return default free tier if no Stripe customer
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        stripeCustomerId: null,
        features: getTierFeatures('free'),
      });
    }

    // Get subscription from Stripe
    const subscription = await getCustomerSubscription(user.stripeCustomerId);

    if (!subscription) {
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        stripeCustomerId: user.stripeCustomerId,
        features: getTierFeatures('free'),
      });
    }

    // Determine tier from subscription
    const tier = subscription.metadata?.tier || 'starter';

    // Type assertion for Stripe subscription properties
    const stripeSubscription = subscription as unknown as Record<string, unknown>;
    const periodStart = (stripeSubscription.current_period_start as number) || 0;
    const periodEnd = (stripeSubscription.current_period_end as number) || 0;

    return NextResponse.json({
      id: subscription.id,
      tier,
      status: subscription.status,
      currentPeriodStart: periodStart * 1000,
      currentPeriodEnd: periodEnd * 1000,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      features: getTierFeatures(tier),
      stripeCustomerId: user.stripeCustomerId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier, successUrl, cancelUrl } = await req.json();

    if (!tier || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    if (!PRICING_TIERS[tier as keyof typeof PRICING_TIERS]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customer ID to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await createCheckoutSession(
      userId,
      tier,
      user.email,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    console.error('POST /api/subscriptions error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
