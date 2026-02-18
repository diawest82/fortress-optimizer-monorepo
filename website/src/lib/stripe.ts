/**
 * Stripe utility for server-side operations
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

// Pricing tier configuration
export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: 29,
    currency: 'usd',
    interval: 'month' as const,
    features: ['10 optimization requests/month', 'Basic analytics', 'Email support'],
    stripeProductId: process.env.STRIPE_PRODUCT_ID_STARTER,
  },
  growth: {
    name: 'Growth',
    price: 99,
    currency: 'usd',
    interval: 'month' as const,
    features: ['100 optimization requests/month', 'Advanced analytics', 'Priority support'],
    stripeProductId: process.env.STRIPE_PRODUCT_ID_GROWTH,
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    currency: 'usd',
    interval: 'month' as const,
    features: ['Unlimited requests', 'Custom analytics', '24/7 phone support'],
    stripeProductId: process.env.STRIPE_PRODUCT_ID_ENTERPRISE,
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
  return stripe.subscriptions.del(subscriptionId);
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
