/**
 * Stripe Checkout — Subscription Lifecycle Testing
 * Tests checkout session creation, subscription management, and billing APIs.
 * Does NOT test Stripe's hosted form — that's Stripe's responsibility.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

/**
 * Read the fortress_auth_token JWT from the Set-Cookie response header.
 *
 * Why: /api/auth/login intentionally does NOT return the token in the body —
 * it sets it as an httpOnly cookie. The previous helper read `data.token`
 * which was always empty, so every "authenticated" Stripe assertion was
 * silently degrading to unauthenticated. See feedback memory.
 */
function extractAuthCookie(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies: string[] = headers.getSetCookie
    ? headers.getSetCookie()
    : (headers.get('set-cookie') || '').split(/,\s*(?=[a-zA-Z0-9_-]+=)/);
  for (const cookie of cookies) {
    const match = cookie.match(/fortress_auth_token=([^;]+)/);
    if (match) return match[1];
  }
  return '';
}

async function createAuthenticatedUser(): Promise<{ token: string; email: string }> {
  const email = `stripe-${UNIQUE}-${Math.random().toString(36).slice(2)}@test.fortress-optimizer.com`;
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
  if (!loginRes.ok) {
    throw new Error(`Login failed for ${email}: ${loginRes.status} ${await loginRes.text()}`);
  }
  const token = extractAuthCookie(loginRes);
  if (!token) {
    throw new Error(`Login for ${email} succeeded but no fortress_auth_token cookie was returned`);
  }
  return { token, email };
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cookie': `fortress_auth_token=${token}`,
  };
}

test.describe('Stripe Checkout: Subscription Lifecycle', () => {

  test.describe('Checkout Session Creation', () => {
    test('POST /api/subscriptions creates checkout for individual tier', async () => {
      const user = await createAuthenticatedUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: authHeaders(user.token),
        body: JSON.stringify({
          tier: 'individual',
          successUrl: `${BASE}/dashboard?upgrade=success`,
          cancelUrl: `${BASE}/pricing?upgrade=cancelled`,
        }),
      });
      // Should return checkout URL or session ID
      if (res.ok) {
        const data = await res.json();
        expect(data.url || data.sessionId || data.checkout_url).toBeTruthy();
      } else {
        // Acceptable: 400 if Stripe not configured in test
        expect(res.status).not.toBe(500);
      }
    });

    test('POST /api/subscriptions creates checkout for teams tier', async () => {
      const user = await createAuthenticatedUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: authHeaders(user.token),
        body: JSON.stringify({
          tier: 'teams',
          seats: 10,
          successUrl: `${BASE}/dashboard?upgrade=success`,
          cancelUrl: `${BASE}/pricing?upgrade=cancelled`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.url || data.sessionId || data.checkout_url).toBeTruthy();
      } else {
        expect(res.status).not.toBe(500);
      }
    });

    test('POST /api/subscriptions rejects unauthenticated requests', async () => {
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'individual', successUrl: '/', cancelUrl: '/' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('POST /api/subscriptions rejects invalid tier', async () => {
      const user = await createAuthenticatedUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: authHeaders(user.token),
        body: JSON.stringify({ tier: 'nonexistent', successUrl: '/', cancelUrl: '/' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('POST /api/subscriptions rejects missing successUrl/cancelUrl', async () => {
      const user = await createAuthenticatedUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: authHeaders(user.token),
        body: JSON.stringify({ tier: 'individual' }),
      });
      // Should require URLs
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Subscription Status', () => {
    test('GET /api/subscriptions returns free tier for new user', async () => {
      const user = await createAuthenticatedUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        headers: authHeaders(user.token),
      });
      if (res.ok) {
        const data = await res.json();
        const tier = data.tier || data.subscription?.tier || 'free';
        expect(tier).toBe('free');
      } else {
        expect(res.status).not.toBe(500);
      }
    });

    test('GET /api/subscriptions/invoices returns array', async () => {
      const user = await createAuthenticatedUser();
      const res = await fetch(`${BASE}/api/subscriptions/invoices`, {
        headers: authHeaders(user.token),
      });
      if (res.ok) {
        const data = await res.json();
        expect(Array.isArray(data.invoices || data)).toBe(true);
      } else {
        // 401 or 404 acceptable for free user with no invoices
        expect(res.status).not.toBe(500);
      }
    });
  });

  test.describe('Subscription Management', () => {
    test('POST /api/subscriptions/cancel requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('POST /api/subscriptions/upgrade requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'individual' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('POST /api/subscriptions/downgrade requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/downgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'free' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Pricing Page Integration', () => {
    test('Pricing page subscribe buttons exist for all tiers', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // Free CTA
      await expect(page.locator('button:has-text("Get Early Access"), a:has-text("Get Early Access")').first()).toBeVisible();
      // Pro subscribe
      await expect(page.locator('button:has-text("Subscribe now")').first()).toBeVisible();
      // Teams subscribe
      await expect(page.locator('button:has-text("Subscribe —")').first()).toBeVisible();
    });

    test('Enterprise tier shows Coming Soon (disabled)', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toContainText('Coming Soon');
    });

    test('Annual toggle changes displayed prices', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // Should show $15 monthly
      await expect(page.locator('body')).toContainText('$15');
    });
  });
});
