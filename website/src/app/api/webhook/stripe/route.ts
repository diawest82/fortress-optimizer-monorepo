/**
 * Stripe Webhook Handler
 * POST /api/webhook/stripe
 * 
 * Handles Stripe events:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/stripe';
import { sendUpgradeConfirmationEmail, sendPaymentFailedEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'STRIPE_WEBHOOK_SECRET not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, process.env.STRIPE_WEBHOOK_SECRET) as Stripe.Event;

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {
          console.error('Missing userId or tier in checkout session');
          break;
        }

        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        // Update user subscription in database
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            tier,
            subscriptionStatus: 'active',
          },
        });

        // Send upgrade confirmation email
        if (user?.email) {
          try {
            const tierPrices: Record<string, string> = {
              individual: '$9.99/month',
              teams: '$99/month',
              enterprise: 'Custom',
            };
            await sendUpgradeConfirmationEmail(user.email, tier, tierPrices[tier] || 'Custom');
          } catch (emailError) {
            console.error('Failed to send upgrade confirmation email:', emailError);
          }
        }

        console.log(`✅ Subscription activated for user ${userId} - tier: ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        if (!customerId) break;

        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) break;

        const tier = subscription.metadata?.tier || 'starter';
        const status = subscription.status === 'active' ? 'active' : 'suspended';

        await prisma.user.update({
          where: { id: user.id },
          data: {
            tier,
            subscriptionStatus: status,
          },
        });

        console.log(`✅ Subscription updated for user ${user.id} - tier: ${tier}, status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        if (!customerId) break;

        // Find user by Stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) break;

        // Downgrade to free tier
        await prisma.user.update({
          where: { id: user.id },
          data: {
            tier: 'free',
            subscriptionStatus: 'cancelled',
          },
        });

        console.log(`✅ Subscription cancelled for user ${user.id} - downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        if (!customerId) break;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) break;

        console.warn(`⚠️  Payment failed for user ${user.id}`);
        // You could send an email notification here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('Webhook error:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
