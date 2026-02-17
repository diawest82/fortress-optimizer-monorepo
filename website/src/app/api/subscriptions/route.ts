/**
 * Subscriptions API
 * GET /api/subscriptions - Get current user subscription
 * POST /api/subscriptions/upgrade - Upgrade subscription tier
 * POST /api/subscriptions/downgrade - Downgrade subscription tier
 * POST /api/subscriptions/cancel - Cancel subscription
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory subscription store (replace with database in production)
interface Subscription {
  userId: string;
  tier: 'free' | 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'cancelled' | 'suspended';
  createdAt: Date;
  renewalDate: Date;
}

const subscriptions: Map<string, Subscription> = new Map();

function extractUserIdFromToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return decoded.id;
  } catch {
    return null;
  }
}

function getDefaultSubscription(userId: string): Subscription {
  return {
    userId,
    tier: 'free',
    status: 'active',
    createdAt: new Date(),
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscription = subscriptions.get(userId) || getDefaultSubscription(userId);

    return NextResponse.json({
      tier: subscription.tier,
      status: subscription.status,
      createdAt: subscription.createdAt,
      renewalDate: subscription.renewalDate,
      features: getTierFeatures(subscription.tier),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getTierFeatures(tier: string) {
  const features: Record<string, string[]> = {
    free: ['Up to 100 emails/month', 'Basic analytics'],
    starter: ['Up to 1000 emails/month', 'Advanced analytics', 'Email support'],
    growth: ['Up to 10000 emails/month', 'Advanced analytics', 'Priority support', 'API access'],
    enterprise: ['Unlimited emails', 'Advanced analytics', '24/7 support', 'API access', 'Custom integrations'],
  };
  return features[tier] || features.free;
}

export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const userId = extractUserIdFromToken(req);

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const currentSubscription = subscriptions.get(userId) || getDefaultSubscription(userId);

    if (pathname.endsWith('/upgrade')) {
      const { newTier } = await req.json();
      const validTiers = ['starter', 'growth', 'enterprise'];

      if (!validTiers.includes(newTier)) {
        return NextResponse.json(
          { error: 'Invalid tier' },
          { status: 400 }
        );
      }

      const updated: Subscription = {
        ...currentSubscription,
        tier: newTier as 'starter' | 'growth' | 'enterprise',
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      subscriptions.set(userId, updated);

      return NextResponse.json({
        message: `Upgraded to ${newTier}`,
        tier: newTier,
        features: getTierFeatures(newTier),
      });
    }

    if (pathname.endsWith('/downgrade')) {
      const { newTier } = await req.json();
      const validTiers = ['free', 'starter', 'growth'];

      if (!validTiers.includes(newTier)) {
        return NextResponse.json(
          { error: 'Invalid tier' },
          { status: 400 }
        );
      }

      const updated: Subscription = {
        ...currentSubscription,
        tier: newTier as 'free' | 'starter' | 'growth',
      };

      subscriptions.set(userId, updated);

      return NextResponse.json({
        message: `Downgraded to ${newTier}`,
        tier: newTier,
        features: getTierFeatures(newTier),
      });
    }

    if (pathname.endsWith('/cancel')) {
      const updated: Subscription = {
        ...currentSubscription,
        status: 'cancelled',
      };

      subscriptions.set(userId, updated);

      return NextResponse.json({
        message: 'Subscription cancelled',
        tier: 'free',
        status: 'cancelled',
      });
    }

    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
