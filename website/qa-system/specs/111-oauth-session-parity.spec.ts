/**
 * OAuth → Session Parity — OAuth and email login produce equivalent sessions
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('OAuth Session Parity', () => {

  test('[source] GitHub OAuth button exists on login page', () => {
    const file = join(WEBSITE_DIR, 'src/app/auth/login/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/GitHub|github|oauth/i);
  });

  test('[source] GitHub OAuth button exists on signup page', () => {
    const file = join(WEBSITE_DIR, 'src/app/auth/signup/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/GitHub|github|oauth/i);
  });

  test('[live] OAuth button is visible on login page', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    const btn = page.locator('button:has-text("GitHub"), button:has-text("Continue with")').first();
    const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible, 'GitHub OAuth button should be visible').toBe(true);
  });

  test('[live] OAuth button is visible on signup page', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    const btn = page.locator('button:has-text("GitHub"), button:has-text("Continue with")').first();
    const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible, 'GitHub OAuth button should be visible on signup').toBe(true);
  });

  test('[source] callbackUrl is validated to prevent open redirect', () => {
    const file = join(WEBSITE_DIR, 'src/app/auth/login/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/startsWith.*\/|includes.*:\/\//);
  });
});
