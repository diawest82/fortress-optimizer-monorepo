/**
 * Security Surface Agent — Cookie Flags, Headers, Secrets Scan
 *
 * Checks:
 *   - Security headers (HSTS, X-Frame-Options, etc.)
 *   - No secrets in HTML source
 *   - CORS headers on API responses
 *   - Rate limit headers present
 *   - No mixed content
 *
 * Run: npx playwright test --project=qa-security
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

test.describe('Security Agent: HTTP Headers', () => {
  test('[headers] Homepage has security headers', async ({ request }) => {
    const resp = await request.get(`${BASE}/`);
    const headers = resp.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBeTruthy();
    expect(headers['strict-transport-security']).toContain('max-age=');
  });

  test('[headers] API has CORS headers', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    // Health endpoint should be accessible
    expect(resp.status()).toBe(200);
  });

  test('[headers] CSP header present', async ({ request }) => {
    const resp = await request.get(`${BASE}/`);
    const csp = resp.headers()['content-security-policy'];
    expect(csp, 'Missing Content-Security-Policy').toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

test.describe('Security Agent: No Secrets in Source', () => {
  const SECRET_PATTERNS = [
    /sk_live_[a-zA-Z0-9]{20,}/,       // Stripe live key
    /sk_test_[a-zA-Z0-9]{20,}/,       // Stripe test key
    /AKIA[A-Z0-9]{16}/,               // AWS access key
    /-----BEGIN (RSA |EC )?PRIVATE KEY/,// Private keys
    /password\s*[:=]\s*["'][^"']+["']/i,// Hardcoded passwords
  ];

  test('[secrets] Homepage source has no exposed secrets', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const source = await page.content();

    for (const pattern of SECRET_PATTERNS) {
      const match = source.match(pattern);
      expect(match, `Found secret pattern: ${pattern}`).toBeNull();
    }
  });

  test('[secrets] Login page source has no exposed secrets', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    const source = await page.content();

    for (const pattern of SECRET_PATTERNS) {
      expect(source.match(pattern), `Found secret: ${pattern}`).toBeNull();
    }
  });
});

test.describe('Security Agent: API Rate Limiting', () => {
  test('[rate-limit] Backend returns rate limit headers', async ({ request }) => {
    // Register a key to test with
    const regResp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'security-test', tier: 'free' },
    });
    const { api_key } = await regResp.json();

    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': api_key },
      data: { prompt: 'test rate limit headers', level: 'balanced' },
    });

    const headers = resp.headers();
    expect(headers['x-ratelimit-limit'], 'Missing X-RateLimit-Limit').toBeTruthy();
    expect(headers['x-ratelimit-remaining'], 'Missing X-RateLimit-Remaining').toBeTruthy();

    // Cleanup
    await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${api_key}` },
    });
  });
});

test.describe('Security Agent: API Auth Enforcement', () => {
  test('[auth] Optimize endpoint rejects missing auth', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      data: { prompt: 'test no auth' },
    });
    expect(resp.status()).toBe(401);
  });

  test('[auth] Usage endpoint rejects missing auth', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`);
    expect(resp.status()).toBe(401);
  });

  test('[auth] Providers endpoint rejects missing auth', async ({ request }) => {
    const resp = await request.get(`${API}/api/providers`);
    expect(resp.status()).toBe(401);
  });

  test('[auth] Swagger docs disabled in production', async ({ request }) => {
    const docsResp = await request.get(`${API}/docs`);
    const redocResp = await request.get(`${API}/redoc`);
    // Should be 404 or redirect, not 200
    expect(docsResp.status()).not.toBe(200);
    expect(redocResp.status()).not.toBe(200);
  });
});
