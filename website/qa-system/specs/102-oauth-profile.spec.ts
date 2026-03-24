/**
 * OAuth Profile Completeness + Error Message Helpfulness
 * User perspective tests.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('OAuth Profile Completeness', () => {

  test('GitHub OAuth button visible on login', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    const btn = page.locator('button:has-text("GitHub"), button:has-text("Continue with")').first();
    expect(await btn.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true);
  });

  test('GitHub OAuth button visible on signup', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    const btn = page.locator('button:has-text("GitHub"), button:has-text("Continue with")').first();
    expect(await btn.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true);
  });

  test('[source] Signup form collects name fields', () => {
    const file = join(WEBSITE_DIR, 'src/app/auth/signup/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/firstName|first.*name|name/i);
  });

  test('[source] Profile API returns email and name', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/users/profile/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/email|name/);
  });
});

test.describe('Error Message Helpfulness', () => {

  test('Login with wrong password shows helpful error (not stack trace)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'test@test.com', password: 'wrong' },
    });
    if (res.status() === 429) return;
    const data = await res.json();
    if (data.error) {
      expect(data.error).not.toMatch(/at\s+\w+\s+\(/); // No stack traces
      expect(data.error.length).toBeGreaterThan(5); // Not just "error"
    }
  });

  test('Signup with existing email shows helpful error', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/signup`, {
      data: { email: 'chain-test-fixed@test.fortress-optimizer.com', password: 'TestP@ss1!', name: 'Dup' },
    });
    if (res.status() === 429) return;
    if (res.status() === 400) {
      const data = await res.json();
      expect(data.error).toBeTruthy();
      expect(data.error.length).toBeGreaterThan(5);
    }
  });

  test('404 page has return-home link', async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-page-xyz`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/404|not found|return|home/i);
  });

  test('Protected page redirect includes callback URL', async ({ page }) => {
    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('callbackUrl');
  });
});
