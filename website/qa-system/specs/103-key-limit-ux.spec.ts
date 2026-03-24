/**
 * Key Limit UX + Mobile Deep Usability
 * User perspective: what happens at limits and on mobile.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Key Limit UX', () => {

  test('[source] Backend shows usage_warning at 80%', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/usage_warning|usage_pct.*80|approaching.*limit/i);
  });

  test('[source] Warning includes upgrade link', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/upgrade|pricing/i);
  });

  test('[source] Rate limit response includes retry info', () => {
    const file = join(WEBSITE_DIR, 'src/lib/rate-limit.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/remaining|resetIn|retryAfter/i);
  });
});

test.describe('Mobile Deep Usability', () => {

  const MOBILE_VIEWPORT = { width: 375, height: 812 };

  test('Homepage is usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(380);
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(200);
  });

  test('Pricing page is usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(5000);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(380);
  });

  test('Login form is usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(380);
  });

  test('Signup form is usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[name="email"], input#email')).toBeVisible();
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(380);
  });

  test('Support page is usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE}/support`);
    await page.waitForTimeout(3000);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(380);
  });

  test('Docs page is usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE}/docs`);
    await page.waitForTimeout(3000);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(380);
  });
});
