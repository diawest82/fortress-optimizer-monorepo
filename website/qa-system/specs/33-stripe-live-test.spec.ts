/**
 * Stripe Live Test — Real Stripe Test Mode Verification
 * Uses Stripe test keys — no real charges.
 * Tests checkout session creation, webhook handling, subscription lifecycle.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

/**
 * Persistent shared test user for qa-stripe-live.
 *
 * Same pattern as 29-rbac-tier-enforcement.spec.ts and 61-identity-chains:
 * use a deterministic email so the account persists across deploy runs,
 * try login first (rate-limited 5/15min, much more generous than signup's
 * 3/hour), only sign up if the account doesn't exist yet.
 *
 * The 4 tests below all need an authenticated user but none care that the
 * user is unique. Sharing one user is correct.
 *
 * History: helper used to do signup → login → extract cookie per test,
 * burning through the 3-signup/hour rate limiter on every deploy run.
 */
const STRIPE_TEST_EMAIL = 'stripe-test-fixed@test.fortress-optimizer.com';
// NOTE: avoid sequential digits like '123' — password-validation.ts:90
// rejects "Avoid sequential patterns" via regex /(?:012|123|234|...)/
const STRIPE_TEST_PASSWORD = 'StripeFort!ssTest9q7';

function extractAuthCookie(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies: string[] = headers.getSetCookie
    ? headers.getSetCookie()
    : (headers.get('set-cookie') || '').split(/,\s*(?=[a-zA-Z0-9_-]+=)/);
  for (const cookie of cookies) {
    const match = cookie.match(/fortress_auth_token=([^;]+)/);
    if (match) return `fortress_auth_token=${match[1]}`;
  }
  return '';
}

let _cachedUser: { cookie: string; email: string } | null = null;

async function createAuthUser(): Promise<{ cookie: string; email: string }> {
  if (_cachedUser) return _cachedUser;

  // Try login first — account probably exists from a previous run.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STRIPE_TEST_EMAIL, password: STRIPE_TEST_PASSWORD }),
  });
  if (loginRes.ok) {
    const cookie = extractAuthCookie(loginRes);
    if (cookie) {
      _cachedUser = { cookie, email: STRIPE_TEST_EMAIL };
      return _cachedUser;
    }
  }

  // Account doesn't exist — sign it up. Signup itself authenticates and
  // sets the cookie, so no follow-up login needed.
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STRIPE_TEST_EMAIL, password: STRIPE_TEST_PASSWORD, name: 'Stripe Test' }),
  });
  if (!signupRes.ok) {
    throw new Error(
      `[qa-stripe-live] Cannot bootstrap shared test user ${STRIPE_TEST_EMAIL}: ` +
      `login returned ${loginRes.status}, signup returned ${signupRes.status} ${await signupRes.text()}. ` +
      `If signup is rate-limited (429), wait an hour or manually create ` +
      `${STRIPE_TEST_EMAIL} via /admin/users.`
    );
  }
  const cookie = extractAuthCookie(signupRes);
  if (!cookie) {
    throw new Error(`Signup for ${STRIPE_TEST_EMAIL} succeeded but no fortress_auth_token cookie was returned`);
  }
  _cachedUser = { cookie, email: STRIPE_TEST_EMAIL };
  return _cachedUser;
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
      // Always read the body so failure logs show the actual error message,
      // not just "Expected: not 500". The previous bare assertion left us
      // chasing a 500 with no context for ~30 minutes during the 2026-04-08
      // session — fixed by logging the body before asserting.
      const body = await res.text();
      expect(
        res.status,
        `POST /api/subscriptions returned ${res.status}: ${body.slice(0, 500)}`
      ).not.toBe(500);
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
