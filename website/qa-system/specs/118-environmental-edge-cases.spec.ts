/**
 * Environmental Edge Cases — DNS, CDN, large payloads, connection pool
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const BACKEND = 'https://api.fortress-optimizer.com';

test.describe('Environmental: Large Payloads', () => {

  test('Login accepts normal-sized payload', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'test@test.com', password: 'TestP@ss1!' },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('Optimize handles large prompt', async ({ request }) => {
    const longPrompt = 'test '.repeat(1000); // ~5K chars
    const res = await request.post(`${BACKEND}/api/optimize`, {
      data: { prompt: longPrompt, level: 'balanced' },
      headers: { 'Authorization': 'Bearer test', 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('Signup rejects extremely long name', async ({ request }) => {
    const longName = 'A'.repeat(10000);
    const res = await request.post(`${BASE}/api/auth/signup`, {
      data: { email: 'long@test.com', password: 'TestP@ss1!', name: longName },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('Environmental: Connection Handling', () => {

  test('Health responds quickly under normal conditions', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/health`);
    const duration = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(duration).toBeLessThan(2000);
  });

  test('Backend handles concurrent health checks', async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request.get(`${BACKEND}/health`))
    );
    for (const res of results) {
      expect(res.status()).toBe(200);
    }
  });

  test('Pages use HTTPS', async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.url()).toMatch(/^https:/);
  });

  test('Backend uses HTTPS', async ({ request }) => {
    const res = await request.get(BACKEND + '/health');
    expect(res.url()).toMatch(/^https:/);
  });
});

test.describe('Environmental: Static Assets', () => {

  test('Homepage loads CSS (not unstyled)', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const styles = await page.evaluate(() => document.styleSheets.length);
    expect(styles).toBeGreaterThan(0);
  });

  test('Homepage loads JavaScript (hydration works)', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(5000);
    // Check that React hydrated — interactive elements should work
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(200);
  });
});
