/**
 * Stripe Webhook Handler
 * POST /api/webhook/stripe
 *
 * Handles Stripe events:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 * - invoice.payment_succeeded
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/stripe';
import { sendUpgradeConfirmationEmail, sendPaymentFailedEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Price-to-tier mapping
// ---------------------------------------------------------------------------

/**
 * Maps a Stripe price ID to an internal tier name.
 * Price IDs are configured via env vars:
 *   STRIPE_PRICE_PRO, STRIPE_PRICE_TEAM, STRIPE_PRICE_ENTERPRISE
 *
 * Falls back to subscription metadata.tier if no price match is found.
 */
function resolveTierFromPriceId(priceId: string | undefined | null): string | null {
  if (!priceId) return null;

  const map: Record<string, string> = {};

  if (process.env.STRIPE_PRICE_PRO) {
    map[process.env.STRIPE_PRICE_PRO] = 'starter';
  }
  if (process.env.STRIPE_PRICE_TEAM) {
    map[process.env.STRIPE_PRICE_TEAM] = 'teams';
  }
  if (process.env.STRIPE_PRICE_ENTERPRISE) {
    map[process.env.STRIPE_PRICE_ENTERPRISE] = 'enterprise';
  }

  return map[priceId] ?? null;
}

/**
 * Determine the tier for a subscription by inspecting its items' price IDs,
 * then falling back to subscription-level metadata.
 */
function getTierFromSubscription(subscription: Stripe.Subscription): string {
  // Check price IDs on subscription items first
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id;
  const tierFromPrice = resolveTierFromPriceId(priceId);
  if (tierFromPrice) return tierFromPrice;

  // Fallback to metadata
  if (subscription.metadata?.tier) return subscription.metadata.tier;

  return 'starter'; // safe default for paid subscriptions
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findUserByCustomerId(customerId: string) {
  return prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature — throws on failure (returns 400 via catch)
    const event = verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    ) as Stripe.Event;

    console.log(`[stripe-webhook] Processing event: ${event.type} (${event.id})`);

    switch (event.type) {
      // -----------------------------------------------------------------
      // Checkout completed — first-time subscription via Checkout
      // -----------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {
          console.error('[stripe-webhook] Missing userId or tier in checkout session metadata');
          break;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        const stripeCustomerId = extractCustomerId(session.customer);
        const stripeSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId,
            stripeSubscriptionId,
            tier,
            subscriptionStatus: 'active',
          },
        });

        if (user?.email) {
          try {
            const tierPrices: Record<string, string> = {
              starter: '$15/month',
              individual: '$15/month',
              pro: '$15/month',
              teams: '$60+/month',
              enterprise: 'Custom',
            };
            await sendUpgradeConfirmationEmail(user.email, tier, tierPrices[tier] || 'Custom');
          } catch (emailError) {
            console.error('[stripe-webhook] Failed to send upgrade confirmation:', emailError);
          }
        }

        console.log(`[stripe-webhook] Checkout completed: user=${userId} tier=${tier}`);
        break;
      }

      // -----------------------------------------------------------------
      // Subscription created (outside of Checkout, or first webhook)
      // -----------------------------------------------------------------
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        if (!customerId) break;

        const user = await findUserByCustomerId(customerId);
        if (!user) {
          console.warn(`[stripe-webhook] No user found for customer ${customerId} on subscription.created`);
          break;
        }

        const tier = getTierFromSubscription(subscription);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeSubscriptionId: subscription.id,
            tier,
            subscriptionStatus: 'active',
          },
        });

        console.log(`[stripe-webhook] Subscription created: user=${user.id} tier=${tier}`);
        break;
      }

      // -----------------------------------------------------------------
      // Subscription updated (upgrade / downgrade / status change)
      // -----------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        if (!customerId) break;

        const user = await findUserByCustomerId(customerId);
        if (!user) {
          console.warn(`[stripe-webhook] No user found for customer ${customerId} on subscription.updated`);
          break;
        }

        const tier = getTierFromSubscription(subscription);

        // Map Stripe subscription status to our internal status
        let subscriptionStatus: string;
        switch (subscription.status) {
          case 'active':
          case 'trialing':
            subscriptionStatus = 'active';
            break;
          case 'past_due':
            subscriptionStatus = 'suspended';
            break;
          case 'canceled':
          case 'unpaid':
            subscriptionStatus = 'cancelled';
            break;
          default:
            subscriptionStatus = 'active';
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeSubscriptionId: subscription.id,
            tier,
            subscriptionStatus,
          },
        });

        console.log(
          `[stripe-webhook] Subscription updated: user=${user.id} tier=${tier} status=${subscriptionStatus}`
        );
        break;
      }

      // -----------------------------------------------------------------
      // Subscription deleted — downgrade to free
      // -----------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        if (!customerId) break;

        const user = await findUserByCustomerId(customerId);
        if (!user) {
          console.warn(`[stripe-webhook] No user found for customer ${customerId} on subscription.deleted`);
          break;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            tier: 'free',
            subscriptionStatus: 'cancelled',
            stripeSubscriptionId: null,
          },
        });

        console.log(`[stripe-webhook] Subscription deleted: user=${user.id} downgraded to free`);
        break;
      }

      // -----------------------------------------------------------------
      // Invoice payment failed — mark as past_due / suspended
      // -----------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = extractCustomerId(invoice.customer);
        if (!customerId) break;

        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'suspended', // maps to our "past_due" concept
          },
        });

        // Notify user about failed payment
        try {
          await sendPaymentFailedEmail(user.email, user.name || 'there');
        } catch (emailError) {
          console.error('[stripe-webhook] Failed to send payment-failed email:', emailError);
        }

        console.warn(`[stripe-webhook] Payment failed: user=${user.id}`);
        break;
      }

      // -----------------------------------------------------------------
      // Invoice payment succeeded — ensure status is active
      // -----------------------------------------------------------------
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = extractCustomerId(invoice.customer);
        if (!customerId) break;

        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'active',
          },
        });

        console.log(`[stripe-webhook] Payment succeeded: user=${user.id}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('[stripe-webhook] Error:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
