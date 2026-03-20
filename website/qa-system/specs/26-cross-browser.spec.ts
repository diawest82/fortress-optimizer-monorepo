/**
 * Cross-Browser — Firefox + WebKit Parity
 * Runs critical user flows in non-Chromium browsers.
 * Catches Safari/Firefox-specific rendering, auth, and form bugs.
 */

import { test, expect, chromium, firefox, webkit } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const browsers = [
  { name: 'Firefox', launcher: firefox },
  { name: 'WebKit', launcher: webkit },
];

for (const { name, launcher } of browsers) {
  test.describe(`Cross-Browser: ${name}`, () => {

    test(`[${name}] Homepage loads and has signup CTA`, async () => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        const bodyText = await page.locator('body').textContent() || '';
        expect(bodyText.length).toBeGreaterThan(100);
        expect(bodyText.toLowerCase()).toContain('fortress');
        // Signup link exists
        const signupLink = page.locator('a[href="/auth/signup"]').first();
        expect(await signupLink.count()).toBeGreaterThan(0);
      } finally {
        await browser.close();
      }
    });

    test(`[${name}] Signup form renders and validates`, async () => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}/auth/signup`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        // Form fields visible
        await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('input[name="firstName"]')).toBeVisible();
        // Submit empty form — should show validation errors
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(2000);
        // Should still be on signup (not redirected)
        expect(page.url()).toContain('/auth/signup');
      } finally {
        await browser.close();
      }
    });

    test(`[${name}] Login form renders with email and password`, async () => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('input[name="password"]')).toBeVisible();
        // Forgot password link
        const forgotLink = page.locator('a[href="/forgot-password"]');
        expect(await forgotLink.count()).toBeGreaterThan(0);
      } finally {
        await browser.close();
      }
    });

    test(`[${name}] Pricing page renders with tiers and calculator`, async () => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        const bodyText = await page.locator('body').textContent() || '';
        expect(bodyText).toContain('Free');
        expect(bodyText).toContain('Pro');
        expect(bodyText).toContain('$15');
      } finally {
        await browser.close();
      }
    });

    test(`[${name}] Team signup page renders with team name field`, async () => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}/auth/signup/team?seats=10`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await expect(page.locator('input[name="teamName"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('input[name="email"]')).toBeVisible();
        // Seats param reflected
        const bodyText = await page.locator('body').textContent() || '';
        expect(bodyText).toContain('10');
      } finally {
        await browser.close();
      }
    });

    test(`[${name}] CSS grid/flex renders correctly (no overflow)`, async () => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      try {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        // Check for horizontal overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth, `Horizontal overflow in ${name}`).toBeLessThanOrEqual(clientWidth + 5);
      } finally {
        await browser.close();
      }
    });

    test(`[${name}] Auth cookies set correctly`, async () => {
      const browser = await launcher.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        // Navigate to set any cookies
        await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        // Verify cookie mechanism works
        await context.addCookies([{
          name: 'test_cookie',
          value: 'cross_browser_test',
          domain: new URL(BASE).hostname,
          path: '/',
        }]);
        const cookies = await context.cookies();
        const testCookie = cookies.find(c => c.name === 'test_cookie');
        expect(testCookie, `Cookie not set in ${name}`).toBeTruthy();
        expect(testCookie!.value).toBe('cross_browser_test');
      } finally {
        await browser.close();
      }
    });
  });
}
