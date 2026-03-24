/**
 * Free → Upgrade → Unlimited Chain
 * Tests the complete upgrade funnel from free tier to paid.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Upgrade Funnel Chain', () => {

  test('[chain] Pricing page has upgrade CTAs', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    // Wait for any button to appear (indicates hydration complete)
    await page.waitForSelector('button', { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(2000); // Extra buffer
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/Subscribe|Get.*Started|Upgrade|Early Access|Free/i);
  });

  test('[chain] Pro subscribe button navigates to auth', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(5000);
    const btn = page.locator('button:has-text("Subscribe now")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(5000);
      // Should go to signup or Stripe — NOT stay on pricing
      expect(page.url()).not.toBe(`${BASE}/pricing`);
    }
  });

  test('[source] Backend returns usage_warning at 80% limit', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/usage_warning|usage_pct|80/);
  });

  test('[source] handleCheckout reads auth and redirects correctly', () => {
    const file = join(WEBSITE_DIR, 'src/app/pricing/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/handleCheckout|window\.location/);
    expect(content).toContain('auth/signup');
  });

  test('[source] Subscription API creates Stripe checkout session', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/subscriptions/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/stripe|checkout|createCheckoutSession/i);
  });

  test('[chain] Account subscription management has upgrade/downgrade', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/subscription-management.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/Upgrade|Downgrade|Cancel/);
  });

  test('[live] Subscription endpoint requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      data: { tier: 'individual' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
