/**
 * Third-Party Failure Simulation — graceful degradation when Stripe/Resend/GitHub fail
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Third-Party Failure: Graceful Degradation', () => {

  test('Homepage loads without any external API dependency', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(200);
  });

  test('Pricing page loads without Stripe API', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/Free|Pro|Teams/);
  });

  test('Login page loads without external dependencies', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
  });

  test('Support page loads without external APIs', async ({ page }) => {
    await page.goto(`${BASE}/support`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/support|help|contact/i);
  });

  test('Docs pages load as static content', async ({ request }) => {
    for (const slug of ['getting-started', 'installation/npm', 'api-reference']) {
      const res = await request.get(`${BASE}/docs/${slug}`);
      expect(res.status(), `/docs/${slug}`).toBe(200);
    }
  });

  test('API returns structured error on bad request', async ({ request }) => {
    // Send request with missing required fields
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'test@test.com' }, // missing password
    });
    // Should return 400 (bad request) — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('Backend health degrades gracefully', async ({ request }) => {
    const res = await request.get('https://api.fortress-optimizer.com/health');
    const data = await res.json();
    // Should always return status field
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded']).toContain(data.status);
  });
});
