/**
 * OAuth Flow — GitHub OAuth integration verification
 * Full round-trip requires GitHub OAuth test app configured.
 * These tests verify the integration points exist and are configured.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('OAuth Flow: GitHub Integration', () => {

  test('GitHub OAuth button exists on login page', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const githubBtn = page.locator('button:has-text("GitHub"), button:has-text("Continue with GitHub")').first();
    await expect(githubBtn).toBeVisible({ timeout: 5000 });
  });

  test('GitHub OAuth button exists on signup page', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const githubBtn = page.locator('button:has-text("GitHub"), button:has-text("Continue with GitHub")').first();
    await expect(githubBtn).toBeVisible({ timeout: 5000 });
  });

  test('GitHub OAuth button exists on team signup page', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup/team?seats=5`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const githubBtn = page.locator('button:has-text("GitHub"), button:has-text("Continue with GitHub")').first();
    await expect(githubBtn).toBeVisible({ timeout: 5000 });
  });

  test('OAuth callback URL is configured in source', async () => {
    const loginClient = readFileSync(join(WEBSITE_DIR, 'src/app/auth/login/client.tsx'), 'utf-8');
    expect(loginClient).toMatch(/github|oauth|signin/i);
    expect(loginClient).toContain('callbackUrl');
  });

  test('NextAuth GitHub provider is likely configured (env var pattern)', async () => {
    // Check for NextAuth config references
    const authFiles = ['src/app/api/auth/[...nextauth]/route.ts', 'src/lib/auth.ts'];
    let found = false;
    for (const path of authFiles) {
      try {
        const content = readFileSync(join(WEBSITE_DIR, path), 'utf-8');
        if (content.includes('GitHub') || content.includes('github')) {
          found = true;
          break;
        }
      } catch { /* file may not exist */ }
    }
    // Also check login client for github reference
    const loginClient = readFileSync(join(WEBSITE_DIR, 'src/app/auth/login/client.tsx'), 'utf-8');
    if (loginClient.includes('github')) found = true;
    expect(found, 'GitHub OAuth should be referenced in auth code').toBe(true);
  });
});
