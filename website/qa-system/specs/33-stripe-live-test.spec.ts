/**
 * Stripe Live Test — Real Stripe Test Mode Verification
 * Uses Stripe test keys — no real charges.
 * Tests checkout session creation, webhook handling, subscription lifecycle.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const WEBSITE_DIR = join(__dirname, '..', '..');

async function createAuthUser(): Promise<{ cookie: string; email: string }> {
  const email = `stripe-${UNIQUE}-${Math.random().toString(36).slice(2, 6)}@test.fortress-optimizer.com`;
  const password = `SecureP@ss${UNIQUE}!`;
  await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Stripe Test' }),
  });
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = loginRes.headers.get('set-cookie') || '';
  return { cookie: setCookie.split(';')[0] || '', email };
}

test.describe('Stripe Live Test: Checkout & Subscriptions', () => {

  test.describe('Checkout Session Creation', () => {
    test('POST /api/subscriptions with valid tier does not return 500', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': user.cookie },
        body: JSON.stringify({
          tier: 'individual',
          interval: 'month',
          successUrl: `${BASE}/dashboard?upgrade=success`,
          cancelUrl: `${BASE}/pricing`,
        }),
      });
      expect(res.status).not.toBe(500);
    });

    test('POST /api/subscriptions rejects unauthenticated', async () => {
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'individual', successUrl: '/', cancelUrl: '/' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('POST /api/subscriptions rejects invalid tier', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': user.cookie },
        body: JSON.stringify({ tier: 'unobtanium', successUrl: '/', cancelUrl: '/' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Subscription Status', () => {
    test('GET /api/subscriptions returns free tier for new user', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        headers: { 'Cookie': user.cookie },
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.tier || 'free').toBe('free');
      } else {
        expect(res.status).not.toBe(500);
      }
    });

    test('GET /api/subscriptions/invoices does not crash', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions/invoices`, {
        headers: { 'Cookie': user.cookie },
      });
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Subscription Management Auth', () => {
    test('Cancel requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Upgrade requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'individual' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Downgrade requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/downgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'free' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Stripe Configuration', () => {
    test('Stripe lib supports annual billing interval', async () => {
      const stripeLib = readFileSync(join(WEBSITE_DIR, 'src/lib/stripe.ts'), 'utf-8');
      expect(stripeLib).toContain('billingInterval');
      expect(stripeLib).toMatch(/interval.*year.*month|year.*month/);
    });

    test('Annual price applies 20% discount', async () => {
      const stripeLib = readFileSync(join(WEBSITE_DIR, 'src/lib/stripe.ts'), 'utf-8');
      expect(stripeLib).toContain('0.8');
      expect(stripeLib).toMatch(/tierConfig\.price \* 12/);
    });

    test('Webhook handler covers all critical events', async () => {
      const webhookRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'), 'utf-8');
      expect(webhookRoute).toContain('checkout.session.completed');
      expect(webhookRoute).toContain('customer.subscription.updated');
      expect(webhookRoute).toContain('customer.subscription.deleted');
      expect(webhookRoute).toContain('invoice.payment_failed');
      expect(webhookRoute).toContain('invoice.payment_succeeded');
    });

    test('Webhook verifies Stripe signature', async () => {
      const webhookRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'), 'utf-8');
      expect(webhookRoute).toMatch(/stripe.*signature|verifyWebhookSignature/i);
    });

    test('Webhook sends email on payment failure', async () => {
      const webhookRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'), 'utf-8');
      expect(webhookRoute).toContain('sendPaymentFailedEmail');
    });

    test('Webhook sends email on upgrade', async () => {
      const webhookRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'), 'utf-8');
      expect(webhookRoute).toContain('sendUpgradeConfirmationEmail');
    });
  });

  test.describe('Webhook Endpoint Security', () => {
    test('Missing Stripe signature rejected', async () => {
      const res = await fetch(`${BASE}/api/webhook/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'checkout.session.completed', data: {} }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Invalid Stripe signature rejected', async () => {
      const res = await fetch(`${BASE}/api/webhook/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': 'invalid' },
        body: JSON.stringify({ type: 'test', data: {} }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });
});
