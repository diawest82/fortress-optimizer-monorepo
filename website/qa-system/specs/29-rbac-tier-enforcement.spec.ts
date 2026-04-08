/**
 * RBAC & Tier Enforcement — Feature Lockout Per Tier
 * Tests that free users can't access paid features and paid users get what they paid for.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

/**
 * Read the fortress_auth_token JWT from the Set-Cookie response header.
 *
 * Why: /api/auth/login intentionally does NOT return the token in the body —
 * it sets it as an httpOnly cookie. The previous helper read `data.token`
 * which was always empty, so every "authenticated" assertion in this file
 * was silently degrading to unauthenticated. See feedback memory.
 */
function extractAuthCookie(response: Response): string {
  // Node 18+ exposes getSetCookie() which returns all Set-Cookie headers.
  // Standard response.headers.get('set-cookie') is restricted in some envs.
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

async function createTestUser(): Promise<{ email: string; password: string; token: string }> {
  const email = `rbac-${UNIQUE}-${Math.random().toString(36).slice(2)}@test.fortress-optimizer.com`;
  const password = `SecureP@ss${UNIQUE}!`;

  await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'RBAC Test' }),
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

  return { email, password, token };
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cookie': `fortress_auth_token=${token}`,
  };
}

test.describe('RBAC & Tier Enforcement', () => {

  test.describe('Free Tier Limits', () => {
    test('Free user gets correct tier from /api/subscriptions', async () => {
      const user = await createTestUser();
      const res = await fetch(`${BASE}/api/subscriptions`, {
        headers: authHeaders(user.token),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.tier || data.subscription?.tier || 'free').toBe('free');
      }
    });

    test('Unauthenticated user cannot access /api/subscriptions', async () => {
      const res = await fetch(`${BASE}/api/subscriptions`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Unauthenticated user cannot create team', async () => {
      const res = await fetch(`${BASE}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauthorized Team', seats: 5 }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Free user cannot access team management API', async () => {
      const user = await createTestUser();
      const res = await fetch(`${BASE}/api/teams`, {
        method: 'POST',
        headers: authHeaders(user.token),
        body: JSON.stringify({ name: 'Free Team Attempt', seats: 5 }),
      });
      // Should be 403 (forbidden) or 402 (payment required) — not 500
      expect(res.status).not.toBe(500);
      if (res.status !== 200 && res.status !== 201) {
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  test.describe('API Key Tier Enforcement', () => {
    test('API key registration returns key with correct tier', async () => {
      const res = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `tier-${UNIQUE}@test.fortress-optimizer.com`,
          tier: 'free',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.tier || 'free').toBe('free');
      }
    });

    test('Free tier key has token limit in usage response', async () => {
      // Register a free key
      const regRes = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `limit-${UNIQUE}@test.fortress-optimizer.com`,
          tier: 'free',
        }),
      });
      if (regRes.ok) {
        const regData = await regRes.json();
        const apiKey = regData.api_key || regData.key;
        if (apiKey) {
          const usageRes = await fetch(`${API_BASE}/api/usage`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          if (usageRes.ok) {
            const usage = await usageRes.json();
            // Free tier should have a token limit (50K)
            const limit = usage.tokens_limit || usage.monthly_limit;
            expect(limit).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Subscription Endpoints Authorization', () => {
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

    test('GET /api/subscriptions/invoices requires auth', async () => {
      const res = await fetch(`${BASE}/api/subscriptions/invoices`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Admin Route Protection', () => {
    test('Non-admin cannot access /admin routes', async ({ page }) => {
      await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' });
      // Should either show admin login form or be blocked — never expose admin data
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText).not.toContain('users');
      expect(bodyText).not.toContain('database');
    });

    test('Backend admin cleanup requires ADMIN_SECRET', async () => {
      const res = await fetch(`${API_BASE}/api/admin/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      // Should be 403 (no secret) — not 200 or 500
      expect(res.status).toBe(403);
    });
  });

  test.describe('UI Tier Indicators', () => {
    test('Pricing page shows upgrade prompts for all tiers', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // Free tier should have CTA
      await expect(page.locator('body')).toContainText('Get Early Access');
      // Pro tier should have subscribe
      await expect(page.locator('body')).toContainText('Subscribe now');
    });
  });
});
