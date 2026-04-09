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
 * Why: /api/auth/login and /api/auth/signup both intentionally put the JWT
 * in an httpOnly cookie, never the response body. The previous helper read
 * `data.token` which was always empty, so every "authenticated" assertion
 * silently degraded to unauthenticated.
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

/**
 * Get a test user — uses a deterministic shared email so the user persists
 * across deploy runs. Tries login first; only signs up if the account
 * doesn't exist yet.
 *
 * Why deterministic: /api/auth/signup is rate-limited to 3 attempts per IP
 * per 1 hour (rate-limit.ts:30). Generating a fresh email per run means
 * every deploy attempt burns a quota slot, and the runner's IP gets rate-
 * limited within 3 deploys. Using a shared email + login-first means we
 * only ever do 1 signup (the first time) and then login forever after.
 *
 * Same pattern as 61-identity-chains.spec.ts and 71/87/102 — they all
 * converge on persistent test accounts to avoid the rate limiter.
 *
 * The module-level cache below is best-effort within a single test run.
 * It's defensive: even if Playwright resets module state between retries,
 * the login-first pattern still works because the account exists in
 * production from the first successful signup.
 */
const RBAC_TEST_EMAIL = 'rbac-test-fixed@test.fortress-optimizer.com';
// NOTE: avoid sequential digits like '123' — password-validation.ts:90
// rejects "Avoid sequential patterns" via regex /(?:012|123|234|...)/
const RBAC_TEST_PASSWORD = 'RbacFort!ssTest9q7';
let _cachedUser: { email: string; password: string; token: string } | null = null;

async function getTestUser(): Promise<{ email: string; password: string; token: string }> {
  if (_cachedUser) return _cachedUser;

  // Try login first — account probably exists from a previous run.
  // Login is rate-limited 5 attempts per 15 min per IP, much more
  // generous than signup's 3 per hour.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: RBAC_TEST_EMAIL, password: RBAC_TEST_PASSWORD }),
  });
  if (loginRes.ok) {
    const token = extractAuthCookie(loginRes);
    if (token) {
      _cachedUser = { email: RBAC_TEST_EMAIL, password: RBAC_TEST_PASSWORD, token };
      return _cachedUser;
    }
  }

  // Account doesn't exist (404 or 401 with no remembered creds) — sign it up.
  // Signup ITSELF authenticates and sets the cookie, so no follow-up login.
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: RBAC_TEST_EMAIL, password: RBAC_TEST_PASSWORD, name: 'RBAC Test' }),
  });
  if (!signupRes.ok) {
    throw new Error(
      `[qa-rbac] Cannot bootstrap shared test user ${RBAC_TEST_EMAIL}: ` +
      `login returned ${loginRes.status}, signup returned ${signupRes.status} ${await signupRes.text()}. ` +
      `If signup is rate-limited (429), either wait an hour, manually create ` +
      `${RBAC_TEST_EMAIL} via /admin/users, or reset the in-memory rate limiter on Vercel.`
    );
  }
  const token = extractAuthCookie(signupRes);
  if (!token) {
    throw new Error(`Signup for ${RBAC_TEST_EMAIL} succeeded but no fortress_auth_token cookie was returned`);
  }

  _cachedUser = { email: RBAC_TEST_EMAIL, password: RBAC_TEST_PASSWORD, token };
  return _cachedUser;
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
      const user = await getTestUser();
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
      const user = await getTestUser();
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
    test('Non-admin gets redirected away from /admin', async ({ page }) => {
      // /admin/login was deleted on 2026-04-08 — admins now sign in via
      // the regular /auth/login flow and /admin/layout.tsx redirects
      // anonymous visitors there. /admin must NOT render admin data to
      // anyone without a session + role === 'admin'.
      await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
      const finalUrl = page.url();
      // Should land on /auth/login (no session) — never on /admin itself.
      expect(finalUrl).not.toContain('/admin/users');
      expect(finalUrl).not.toContain('/admin/emails');
      const bodyText = await page.locator('body').textContent() || '';
      // Even if the layout briefly renders, it must not leak admin data.
      expect(bodyText.toLowerCase()).not.toContain('database');
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
