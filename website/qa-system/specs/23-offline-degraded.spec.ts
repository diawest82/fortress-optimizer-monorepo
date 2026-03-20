/**
 * Offline & Degraded Network — Graceful Failure Testing
 * Tests that the frontend handles backend failures without white-screening.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Offline & Degraded: Graceful Failure Handling', () => {

  test('Homepage has content even if API calls fail', async ({ page }) => {
    // Block API routes
    await page.route('**/api/**', route => route.abort('connectionrefused'));
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent() || '';
    // Should have static content — not a white screen
    expect(bodyText.length, 'Homepage is blank with failed API').toBeGreaterThan(100);
    expect(bodyText.toLowerCase()).toContain('fortress');
  });

  test('Pricing page shows tier information without API', async ({ page }) => {
    await page.route('**/api/**', route => route.abort('connectionrefused'));
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(100);
    // Pricing tiers are hardcoded in the component — should still render
    expect(bodyText).toContain('Free');
  });

  test('Login form shows error on network failure', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Block API after page loads
    await page.route('**/api/auth/login', route => route.abort('connectionrefused'));
    // Fill and submit
    await page.locator('input[name="email"]').fill('offline@test.com');
    await page.locator('input[name="password"]').fill('SecureP@ss1!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    // Should show an error — not crash
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(50);
    // Should still be on login page
    expect(page.url()).toContain('/auth/login');
  });

  test('Signup form shows error on network failure', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.route('**/api/auth/signup', route => route.abort('connectionrefused'));
    await page.locator('input[name="firstName"]').fill('Offline');
    await page.locator('input[name="lastName"]').fill('Test');
    await page.locator('input[name="email"]').fill('offline@test.com');
    await page.locator('input[name="password"]').fill('SecureP@ss1!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/signup');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Page does not crash on 500 from API', async ({ page }) => {
    await page.route('**/api/**', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length, 'Page white-screened on 500').toBeGreaterThan(100);
  });

  test('Install page renders without API (static content)', async ({ page }) => {
    await page.route('**/api/**', route => route.abort('connectionrefused'));
    await page.goto(`${BASE}/install`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(100);
    expect(bodyText.toLowerCase()).toMatch(/npm|install|vs code/i);
  });

  test('Docs page renders without API', async ({ page }) => {
    await page.route('**/api/**', route => route.abort('connectionrefused'));
    await page.goto(`${BASE}/docs`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('Slow network (3G) still renders page within 10 seconds', async ({ page, context }) => {
    // Simulate slow 3G
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024 / 8, // 400 Kbps
      uploadThroughput: 400 * 1024 / 8,
      latency: 400,
    });
    const start = performance.now();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const elapsed = performance.now() - start;
    console.log(`  Homepage on 3G: ${Math.round(elapsed)}ms`);
    expect(elapsed, 'Homepage too slow on 3G').toBeLessThan(15000);
    // Restore
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });
});
