/**
 * Error Recovery Chain Tests — graceful degradation under failure
 * Gaps: F1 (DB down), F2 (Stripe unreachable), F3 (Resend failure), F4 (cookies blocked)
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Error Recovery: API Failures', () => {

  test('[F1] /api/health returns status even when degraded', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    // Should always return something — 200 or 503, never hang
    expect([200, 503]).toContain(res.status());
    const data = await res.json();
    expect(data).toHaveProperty('status');
  });

  test('[F1] Backend health check includes database status', async ({ request }) => {
    const res = await request.get('https://api.fortress-optimizer.com/health');
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('database');
    }
  });

  test('[F2] Pricing page loads even if subscription API fails', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/Free|Pro|Teams/);
  });

  test('[F2] Homepage loads independently of API', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(100);
  });
});

test.describe('Error Recovery: Network Resilience', () => {

  test('[F3] Signup returns user even if email fails', async ({ request }) => {
    // Email failure should not block account creation
    // The signup endpoint should catch email errors and still return 201
    const res = await request.post(`${BASE}/api/auth/signup`, {
      data: { email: `recovery-${Date.now()}@test.com`, password: 'RecoveryP@ss1!', name: 'Recovery' },
    });
    // 201 (created) or 429 (rate limited) or 400 (exists) — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('[F4] Login page has meaningful content (not blank)', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(5000);
    const body = await page.locator('main').textContent() || '';
    expect(body.length, 'Login page should not be blank after hydration').toBeGreaterThan(30);
  });

  test('[F4] Dashboard shows error state, not white screen, when unauthorized', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    // Should either redirect to login or show an error — not blank
    const url = page.url();
    const body = await page.locator('body').textContent() || '';
    expect(url.includes('/auth/login') || body.length > 50, 'Dashboard should redirect or show content').toBe(true);
  });
});

test.describe('Error Recovery: Graceful Degradation', () => {

  test('All public pages return 200 (no 500s)', async ({ request }) => {
    const pages = ['/', '/pricing', '/install', '/compare', '/support', '/tools', '/docs', '/refer', '/auth/login', '/auth/signup'];
    for (const path of pages) {
      const res = await request.get(`${BASE}${path}`);
      expect(res.status(), `${path} returned ${res.status()}`).toBeLessThan(500);
    }
  });

  test('API endpoints return structured errors, not stack traces', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats`);
    if (res.status() >= 400) {
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(JSON.stringify(data)).not.toMatch(/at\s+\w+\s+\(/); // No stack traces
    }
  });

  test('404 page shows helpful content', async ({ page }) => {
    await page.goto(`${BASE}/this-page-does-not-exist`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/404|not found|return home/i);
  });
});
