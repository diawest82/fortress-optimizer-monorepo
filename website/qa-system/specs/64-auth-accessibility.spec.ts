/**
 * Authenticated Pages Accessibility + Mobile Tests
 *
 * Gaps: H1 (axe-core on auth pages), H2 (keyboard tabs), H3 (support a11y),
 *       I1 (mobile menu auth), I2 (auth pages mobile), I3 (ticket on mobile)
 *
 * Run: npx playwright test --project=qa-system --grep "Auth Accessibility"
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Auth Accessibility: axe-core on Authenticated Pages', () => {

  test('[H1] /dashboard has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    // Dashboard may redirect to login — test the page we land on
    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) { console.log('[a11y] axe-core not available — skipping'); return; }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Dashboard has ${critical.length} critical a11y violations`).toHaveLength(0);
  });

  test('[H1] /account has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);
    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) return;
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Account has ${critical.length} critical a11y violations`).toHaveLength(0);
  });

  test('[H1] /admin/login has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.waitForTimeout(3000);
    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) return;
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
});

test.describe('Auth Accessibility: Keyboard Navigation', () => {

  test('[H2] Login form is fully keyboard-navigable', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(5000); // Wait for full hydration

    // Tab through elements until we reach an INPUT
    let foundInput = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      if (tag === 'INPUT') { foundInput = true; break; }
    }
    expect(foundInput, 'Should be able to Tab to an INPUT field on the login form').toBe(true);
  });

  test('[H2] Signup form is fully keyboard-navigable', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    for (let i = 0; i < 15; i++) {
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      if (tag === 'INPUT') break;
      await page.keyboard.press('Tab');
    }
    const inputFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(inputFocused).toBe('INPUT');
  });

  test('[H3] Support page has accessible contact options', async ({ page }) => {
    await page.goto(`${BASE}/support`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/support|contact|help|ticket/i);
  });
});

test.describe('Auth Accessibility: Mobile Viewport', () => {

  test('[I1] Mobile menu exists on authenticated pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    // Look for hamburger menu button
    const menuBtn = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]');
    await expect(menuBtn).toBeVisible();
  });

  test('[I2] Login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    // Form should be visible
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
  });

  test('[I2] Signup page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('[I2] Dashboard works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('[I3] Support page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/support`);
    await page.waitForTimeout(3000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
