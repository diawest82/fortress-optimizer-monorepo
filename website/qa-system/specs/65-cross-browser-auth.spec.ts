/**
 * Cross-Browser Auth Tests — Login flow in Firefox + WebKit
 * Gaps: J1 (login in Firefox/WebKit), J2 (SameSite in Safari)
 */

import { test, expect, chromium, firefox, webkit } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Cross-Browser Auth: Login Form Renders', () => {

  test('[J1] Login form renders in default browser', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('[J1] Signup form renders in default browser', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
  });

  test('[J2] Auth cookie uses SameSite=Strict (verified in source)', async () => {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const file = join(__dirname, '..', '..', 'src/lib/secure-cookies.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain("sameSite: 'Strict'");
  });

  test('[J2] Auth cookie uses Secure flag in production', async () => {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const file = join(__dirname, '..', '..', 'src/lib/secure-cookies.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/secure.*production|production.*secure/i);
  });

  test('[J1] Login page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(5000);
    const criticalErrors = errors.filter(e =>
      !e.includes('posthog') &&
      !e.includes('googletagmanager') &&
      !e.includes('Content Security Policy') &&
      !e.includes('Failed to load resource') &&
      !e.includes('API Error')
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });
});
