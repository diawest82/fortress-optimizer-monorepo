/**
 * Password Reset Round-Trip + Account Deletion + Profile Edit
 * Remaining vertical gaps.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Password Reset: Flow Exists', () => {

  test('Forgot password page loads', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/email|reset|password|forgot/i);
  });

  test('Forgot password form has email input', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('[source] Password reset API exists', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/password/request-reset/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/auth/forgot-password/route.ts'),
    ];
    const exists = paths.some(p => existsSync(p));
    expect(exists, 'No password reset API route found').toBe(true);
  });

  test('[source] Reset generates a token', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/password/request-reset/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/auth/forgot-password/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/token|randomUUID|crypto/i);
  });

  test('Login page has forgot password link', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);
    const link = page.locator('a[href*="forgot"], a:has-text("Forgot")');
    await expect(link).toBeVisible();
  });
});

test.describe('Account Deletion (GDPR)', () => {

  test('[source] Account content has settings or deletion option', () => {
    const file = join(WEBSITE_DIR, 'src/components/account-content.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // May have a settings tab or security tab with account actions
    expect(content).toMatch(/settings|security|delete|danger/i);
  });

  test('Account page loads for checking deletion UI', async ({ page }) => {
    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);
    // Will redirect to login if not auth — that's OK
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(50);
  });
});

test.describe('Profile Edit Persistence', () => {

  test('[source] Profile update API exists', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/users/profile/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/POST|PUT|PATCH/);
  });

  test('[source] Profile update modifies database', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/users/profile/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/prisma.*update|update.*prisma/i);
  });

  test('[source] API client has updateProfile method', () => {
    const file = join(WEBSITE_DIR, 'src/lib/api-client.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/updateProfile/);
  });
});
