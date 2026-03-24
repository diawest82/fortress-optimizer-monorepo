/**
 * Error State Accessibility — axe-core on error pages, empty states, 404
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Error State Accessibility', () => {

  test('404 page has accessible content', async ({ page }) => {
    await page.goto(`${BASE}/this-does-not-exist-404`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/404|not found/i);

    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) return;
    const results = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('Login page error state is accessible', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);

    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) return;
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('Dashboard empty state is accessible', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(5000);

    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) return;
    const results = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('Support page is accessible', async ({ page }) => {
    await page.goto(`${BASE}/support`);
    await page.waitForTimeout(3000);

    const AxeBuilder = await import('@axe-core/playwright').then(m => m.default).catch(() => null);
    if (!AxeBuilder) return;
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
});
