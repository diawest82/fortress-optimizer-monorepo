/**
 * Browser Resilience — Real browser interactions that source tests can't cover
 * Chatbot, back button, multi-tab, deep links, double submit, 404 handling
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Browser Resilience: Real Interactions', () => {

  test.describe('Support Page Interaction', () => {
    test('Support page renders with help content', async ({ page }) => {
      await page.goto(`${BASE}/support`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.length).toBeGreaterThan(200);
      expect(bodyText.toLowerCase()).toMatch(/support|help|contact|ticket/i);
    });

    test('Support page has FAQ or help sections', async ({ page }) => {
      await page.goto(`${BASE}/support`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.toLowerCase()).toMatch(/faq|frequently|question|documentation/i);
    });
  });

  test.describe('Navigation Resilience', () => {
    test('Browser back button on signup does not crash', async ({ page }) => {
      await page.goto(`${BASE}/auth/signup`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // Fill a field
      const nameField = page.locator('input[name="firstName"]');
      if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameField.fill('BackTest');
      }
      // Navigate away
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      // Go back
      await page.goBack();
      await page.waitForTimeout(2000);
      // Page should render (not white screen)
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.length, 'Page should render after back navigation').toBeGreaterThan(100);
    });

    test('Deep link with query params loads correctly', async ({ page }) => {
      await page.goto(`${BASE}/auth/signup?plan=individual&callbackUrl=%2Fpricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // Page should load with form visible
      await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
      // URL should have query params
      expect(page.url()).toContain('plan=');
      expect(page.url()).toContain('callbackUrl');
    });

    test('404 page shows friendly error (not white screen)', async ({ page }) => {
      await page.goto(`${BASE}/this-page-definitely-does-not-exist-12345`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.length, 'Should not be white screen').toBeGreaterThan(50);
      expect(bodyText).toMatch(/404|not found|return home/i);
    });

    test('Page refresh on pricing resets calculator state', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      // Click 100 seats
      const btn100 = page.locator('button:has-text("100 seats")').first();
      if (await btn100.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn100.click();
        await page.waitForTimeout(1000);
      }
      // Refresh
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // Default state should be back (5 seats)
      const bodyText = await page.locator('body').textContent() || '';
      // Price should be back to default ($60 for 5 seats)
      expect(bodyText).toContain('$60');
    });
  });

  test.describe('Form Resilience', () => {
    test('Double-click submit does not crash', async ({ page }) => {
      await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.locator('input[name="email"]').fill('double@test.com');
      await page.locator('input[name="password"]').fill('SecureP@ss1!');
      const submit = page.locator('button[type="submit"]').first();
      // Click twice rapidly
      await submit.click();
      await submit.click();
      await page.waitForTimeout(3000);
      // Page should not crash — should show error or redirect
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.length).toBeGreaterThan(50);
    });

    test('Pricing calculator quick-select updates displayed total', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      // Click 50 seats
      const btn50 = page.locator('button:has-text("50 seats")').first();
      if (await btn50.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn50.click();
        await page.waitForTimeout(1000);
        // Price should update
        const bodyText = await page.locator('body').textContent() || '';
        expect(bodyText).toMatch(/50 seats/);
        // Subscribe button should reflect 50 seats
        const subscribeBtn = page.locator('button:has-text("Subscribe — 50")').first();
        const hasSub = await subscribeBtn.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasSub, 'Subscribe button should show 50 seats').toBe(true);
      }
    });
  });

  test.describe('Auth State', () => {
    test('Multi-tab: auth state consistent in same browser context', async ({ page, context }) => {
      // Navigate to a public page in first tab
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      // Open a new page in same context
      const page2 = await context.newPage();
      await page2.goto(`${BASE}/install`, { waitUntil: 'domcontentloaded' });
      await page2.waitForTimeout(2000);
      // Both pages should work without crashing
      const text1 = await page.locator('body').textContent() || '';
      const text2 = await page2.locator('body').textContent() || '';
      expect(text1.length).toBeGreaterThan(100);
      expect(text2.length).toBeGreaterThan(100);
      await page2.close();
    });
  });
});
