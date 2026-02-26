/**
 * Stripe utility for server-side operations
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

// Pricing tier configuration
export const PRICING_TIERS = {
  individual: {
    name: 'Individual',
    price: 9.99,
    currency: 'usd',
    interval: 'month' as const,
    features: [
      '500K tokens/month',
      'All 5 integration channels',
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
    price: 99,
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
  cancelUrl: string
) {
  const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
  if (!tierConfig) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  if (!tierConfig.stripeProductId) {
    throw new Error(`Product ID not configured for tier: ${tier}`);
  }

  // Get or create a price for this tier
  const prices = await stripe.prices.list({
    product: tierConfig.stripeProductId,
    active: true,
  });

  let priceId = prices.data[0]?.id;

  // If no price exists, create one
  if (!priceId) {
    const price = await stripe.prices.create({
      product: tierConfig.stripeProductId,
      unit_amount: tierConfig.price * 100, // Convert to cents
      currency: tierConfig.currency,
      recurring: {
        interval: tierConfig.interval,
      },
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
