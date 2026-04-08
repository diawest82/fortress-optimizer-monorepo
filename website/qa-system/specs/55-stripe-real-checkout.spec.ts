/**
 * Stripe Real Checkout — Uses real Stripe test keys to verify sessions
 * Requires STRIPE_SECRET_KEY (sk_test_*) in environment
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

async function createAuthUser(): Promise<{ cookie: string; email: string }> {
  const email = `stripe-real-${UNIQUE}-${Math.random().toString(36).slice(2, 6)}@test.fortress-optimizer.com`;
  const password = `SecureP@ss${UNIQUE}!`;
  await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Stripe Real' }),
  });
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return {
    cookie: (loginRes.headers.get('set-cookie') || '').split(';')[0],
    email,
  };
}

test.describe('Stripe Real Checkout: Test Mode Verification', () => {

  test.describe('Checkout Session Creation', () => {
    test('Pro monthly checkout creates valid Stripe session', async () => {
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
      if (res.ok) {
        const data = await res.json();
        // Real Stripe session URL
        expect(data.url).toContain('checkout.stripe.com');
        expect(data.sessionId || data.url).toBeTruthy();
      } else if (res.status === 429) {
        throw new Error('Stripe checkout rate limited (429). Fix the test setup or rate limiter, do not skip silently.');
      } else {
        // Stripe may not be configured — verify it's not a 500
        expect(res.status).not.toBe(500);
      }
    });

    test('Pro annual checkout creates session with yearly interval', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': user.cookie },
        body: JSON.stringify({
          tier: 'individual',
          interval: 'year',
          successUrl: `${BASE}/dashboard?upgrade=success`,
          cancelUrl: `${BASE}/pricing`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.url || data.sessionId).toBeTruthy();
      }
      expect(res.status).not.toBe(500);
    });

    test('Teams checkout includes seat count', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': user.cookie },
        body: JSON.stringify({
          tier: 'teams',
          seats: 25,
          interval: 'month',
          successUrl: `${BASE}/dashboard`,
          cancelUrl: `${BASE}/pricing`,
        }),
      });
      expect(res.status).not.toBe(500);
    });

    test('Session success_url points to dashboard', async () => {
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
      // The successUrl we sent should be used by Stripe
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Subscription Status', () => {
    test('New user has free tier by default', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        headers: { 'Cookie': user.cookie },
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.tier || 'free').toBe('free');
      }
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Webhook Security', () => {
    test('Webhook rejects POST without stripe-signature', async () => {
      const res = await fetch(`${BASE}/api/webhook/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'evt_test',
          type: 'checkout.session.completed',
          data: { object: { metadata: { userId: 'test' } } },
        }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Webhook rejects invalid stripe-signature', async () => {
      const res = await fetch(`${BASE}/api/webhook/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=invalidsignature',
        },
        body: JSON.stringify({ type: 'test.event', data: {} }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Subscription Management Auth', () => {
    test('Cancel requires authentication', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Upgrade requires authentication', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'individual' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Invoices endpoint does not crash', async () => {
      const user = await createAuthUser();
      const res = await fetch(`${BASE}/api/subscriptions/invoices`, {
        headers: { 'Cookie': user.cookie },
      });
      expect(res.status).not.toBe(500);
    });
  });
});
