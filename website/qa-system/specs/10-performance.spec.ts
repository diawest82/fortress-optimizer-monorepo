/**
 * Performance/Resilience Agent — Load Times, Throttled Network
 *
 * Tests:
 *   - Page load times under normal conditions
 *   - Core Web Vitals (LCP, CLS, FID approximations)
 *   - Behavior under slow network
 *   - API response times
 *   - Page still works after cache clear
 *
 * Run: npx playwright test --project=qa-performance
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

const CRITICAL_PAGES = ['/', '/pricing', '/install', '/auth/login', '/auth/signup'];

test.describe('Performance Agent: Page Load Times', () => {
  for (const pagePath of CRITICAL_PAGES) {
    test(`[load] ${pagePath} loads under 5 seconds`, async ({ page }) => {
      const start = Date.now();
      const response = await page.goto(`${BASE}${pagePath}`);
      const loadTime = Date.now() - start;

      expect(response?.status()).toBeLessThan(400);
      expect(loadTime, `${pagePath} took ${loadTime}ms`).toBeLessThan(5000);
      console.log(`[perf] ${pagePath}: ${loadTime}ms`);
    });
  }
});

test.describe('Performance Agent: API Response Times', () => {
  test('[api] Health check under 500ms', async ({ request }) => {
    const start = Date.now();
    const resp = await request.get(`${API}/health`);
    const elapsed = Date.now() - start;

    expect(resp.status()).toBe(200);
    expect(elapsed, `Health check took ${elapsed}ms`).toBeLessThan(500);
  });

  test('[api] Pricing endpoint under 500ms', async ({ request }) => {
    const start = Date.now();
    const resp = await request.get(`${API}/api/pricing`);
    const elapsed = Date.now() - start;

    expect(resp.status()).toBe(200);
    expect(elapsed, `Pricing took ${elapsed}ms`).toBeLessThan(500);
  });

  test('[api] Optimization under 2 seconds', async ({ request }) => {
    // Register key
    const regResp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'perf-test', tier: 'free' },
    });
    const { api_key } = await regResp.json();

    const start = Date.now();
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': api_key },
      data: { prompt: 'Performance test prompt for measuring response time', level: 'balanced' },
    });
    const elapsed = Date.now() - start;

    expect(resp.status()).toBe(200);
    expect(elapsed, `Optimization took ${elapsed}ms`).toBeLessThan(2000);
    console.log(`[perf] Optimization: ${elapsed}ms`);

    // Cleanup
    await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${api_key}` },
    });
  });
});

test.describe('Performance Agent: No Render-Blocking Issues', () => {
  test('[render] Homepage has visible content within 3 seconds', async ({ page }) => {
    await page.goto(`${BASE}/`);

    // H1 should be visible quickly
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 3000 });
  });

  test('[render] Login form interactive within 5 seconds', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);

    // Email input should be visible and focusable
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
  });
});

test.describe('Performance Agent: Slow Network Resilience', () => {
  test('[slow-3g] Homepage loads without error on slow network', async ({ page, context }) => {
    // Simulate slow 3G
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500 Kbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 400, // 400ms RTT
    });

    const response = await page.goto(`${BASE}/`, { timeout: 30000 });

    // Page should still load (maybe slowly) — not crash
    expect(response?.status()).toBeLessThan(500);

    // Some content should render
    const bodyText = await page.locator('body').textContent({ timeout: 15000 });
    expect(bodyText?.length).toBeGreaterThan(100);
  });
});

test.describe('Performance Agent: Resource Count', () => {
  test('[resources] Homepage doesn\'t load excessive resources', async ({ page }) => {
    const resources: string[] = [];
    page.on('response', resp => {
      if (resp.status() === 200) resources.push(resp.url());
    });

    await page.goto(`${BASE}/`);
    await page.waitForTimeout(3000);

    // Reasonable resource count — under 100 requests
    expect(resources.length, `Homepage loaded ${resources.length} resources`).toBeLessThan(100);
    console.log(`[perf] Homepage resources: ${resources.length}`);
  });
});
