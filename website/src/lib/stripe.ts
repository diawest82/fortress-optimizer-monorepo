/**
 * Stripe utility for server-side operations
 *
 * History: this used to throw at module-import time if STRIPE_SECRET_KEY
 * was missing. Any route that imported this module (e.g. /api/subscriptions)
 * would 500 on every request from a Vercel container that didn't have the
 * env var populated yet — and worse, since module-import errors are cached
 * by Node, the route would 500 for the LIFETIME of that container, not
 * just the first request. This caused intermittent qa-stripe-live failures
 * that resolved only when a fresh container started.
 *
 * Fix: lazy-init the Stripe client. The check still happens, but at first
 * USE rather than first import. Routes that don't actually call Stripe
 * (e.g. unauthenticated POST → 401 short-circuit) never trigger the check.
 */
import Stripe from 'stripe';
import { PRICING } from '@/lib/pricing-config';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  });
  return _stripe;
}

// Proxy that defers Stripe client construction until first property access.
// All existing call sites (`stripe.customers.create(...)`, `stripe.prices.list(...)`,
// etc) work unchanged because property access on the proxy lazily constructs
// the real client.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const value = client[prop as keyof Stripe];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

// Pricing tier configuration (prices from PRICING single source of truth)
export const PRICING_TIERS = {
  individual: {
    name: 'Pro',
    price: PRICING.pro.monthly,
    currency: 'usd',
    interval: 'month' as const,
    features: [
      'Unlimited tokens',
      'All 12 integration platforms',
      'Real-time optimization',
      'Advanced analytics dashboard',
      'Email support',
      'API access',
    ],
    stripeProductId: process.env.STRIPE_PRODUCT_ID_INDIVIDUAL,
    checkoutDescription: 'Perfect for developers and small projects. Optimize tokens across all platforms with full analytics and API access.',
  },
  teams: {
    name: 'Teams',
    price: PRICING.teams.baseMonthly,
    currency: 'usd',
    interval: 'month' as const,
    features: [
      'Unlimited tokens',
      'Team seat management',
      'Advanced analytics',
      'Priority email support',
      'Slack integration',
      'Saves $30-150+/month per team',
    ],
    stripeProductId: process.env.STRIPE_PRODUCT_ID_TEAMS,
    checkoutDescription: 'The smart choice for growing teams. Unlimited optimization, team collaboration, and priority support. Save thousands on token costs.',
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // Custom pricing
    currency: 'usd',
    interval: 'month' as const,
    features: [
      'Unlimited everything',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 priority support',
      'SLA guarantee',
      'On-premise deployment',
    ],
    stripeProductId: process.env.STRIPE_PRODUCT_ID_ENTERPRISE,
    checkoutDescription: 'Enterprise-grade solution with unlimited tokens, custom integrations, and dedicated support. Built for large organizations.',
  },
};

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  tier: string,
  email: string,
  successUrl: string,
  cancelUrl: string,
  billingInterval: string = 'month'
) {
  const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
  if (!tierConfig) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  if (!tierConfig.stripeProductId) {
    throw new Error(`Product ID not configured for tier: ${tier}`);
  }

  // Determine price based on interval (annual = 20% discount)
  const interval = billingInterval === 'year' ? 'year' : 'month';
  const unitAmount = interval === 'year'
    ? Math.round(tierConfig.price * 12 * 0.8 * 100) // Annual: 12 months × 80% (20% discount) in cents
    : tierConfig.price * 100; // Monthly in cents

  // Get or create a price for this tier + interval
  const prices = await stripe.prices.list({
    product: tierConfig.stripeProductId,
    active: true,
  });

  // Find matching price for the selected interval
  let priceId = prices.data.find(p =>
    p.recurring?.interval === interval && p.unit_amount === unitAmount
  )?.id;

  // If no matching price exists, create one
  if (!priceId) {
    const price = await stripe.prices.create({
      product: tierConfig.stripeProductId,
      unit_amount: unitAmount,
      currency: tierConfig.currency,
      recurring: { interval: interval as 'month' | 'year' },
    });
    priceId = price.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
  });

  return session;
}

/**
 * Get customer's subscription
 */
export async function getCustomerSubscription(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
  });

  return subscriptions.data[0] || null;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Get invoice for a subscription
 */
export async function getSubscriptionInvoices(subscriptionId: string) {
  return stripe.invoices.list({
    subscription: subscriptionId,
    limit: 10,
  });
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
) {
  try {
    return stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    throw new Error(`Invalid webhook signature: ${error}`);
  }
}
