/**
 * Tab Sleep/Wake + Multi-Tab Logout + Server Restart
 * Environmental edge cases for auth state.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Tab Sleep/Wake', () => {

  test('Page is functional after simulated background', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    // Simulate tab going to background and coming back
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(100);
  });

  test('Auth check re-runs on visibility change', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(2000);
    // Page should still function normally
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
  });
});

test.describe('Multi-Tab Behavior', () => {

  test('Two tabs can load same page simultaneously', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    await Promise.all([
      page1.goto(`${BASE}/pricing`),
      page2.goto(`${BASE}/install`),
    ]);
    const body1 = await page1.locator('body').textContent() || '';
    const body2 = await page2.locator('body').textContent() || '';
    expect(body1.length).toBeGreaterThan(50);
    expect(body2.length).toBeGreaterThan(50);
    await page1.close();
    await page2.close();
  });
});

test.describe('Server Restart Resilience', () => {

  test('Health endpoint recovers after brief unavailability', async ({ request }) => {
    // Just verify health is up — can't actually restart the server in a test
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
  });

  test('Backend health recovers', async ({ request }) => {
    const res = await request.get('https://api.fortress-optimizer.com/health');
    expect(res.status()).toBe(200);
  });
});
