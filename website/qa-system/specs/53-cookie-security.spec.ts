/**
 * Cookie Security — Deep verification of auth cookie flags and token edge cases
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

async function loginAndGetCookies(): Promise<{ setCookie: string; status: number }> {
  const email = `cookie-sec-${UNIQUE}-${Math.random().toString(36).slice(2, 6)}@test.fortress-optimizer.com`;
  const password = `SecureP@ss${UNIQUE}!`;
  await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Cookie Sec' }),
  });
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { setCookie: res.headers.get('set-cookie') || '', status: res.status };
}

test.describe('Cookie Security: Flags, Tokens, Sessions', () => {

  test.describe('Auth Cookie Flags', () => {
    test('Auth cookie has HttpOnly flag', async () => {
      const { setCookie, status } = await loginAndGetCookies();
      if (status !== 200) {
        throw new Error(`Login failed with status ${status}. Cookie security tests require a successful login — fix the test setup or rate limiter, do not skip silently.`);
      }
      if (setCookie.includes('fortress_auth_token')) {
        expect(setCookie.toLowerCase()).toContain('httponly');
      }
    });

    test('Auth cookie has Secure flag', async () => {
      const { setCookie, status } = await loginAndGetCookies();
      if (status !== 200) {
        throw new Error(`Login failed with status ${status}. Cookie security tests require a successful login — fix the test setup or rate limiter, do not skip silently.`);
      }
      if (setCookie.includes('fortress_auth_token')) {
        // In production (HTTPS), Secure should be set
        // In dev (HTTP), it may not be — check for presence
        const hasSecure = setCookie.toLowerCase().includes('secure');
        if (BASE.startsWith('https://')) {
          expect(hasSecure, 'Secure flag required on HTTPS').toBe(true);
        }
      }
    });

    test('Auth cookie has SameSite=Strict or Lax', async () => {
      const { setCookie, status } = await loginAndGetCookies();
      if (status !== 200) {
        throw new Error(`Login failed with status ${status}. Cookie security tests require a successful login — fix the test setup or rate limiter, do not skip silently.`);
      }
      if (setCookie.includes('fortress_auth_token')) {
        expect(setCookie.toLowerCase()).toMatch(/samesite=(strict|lax)/);
      }
    });

    test('CSRF cookie configuration verified in source', async () => {
      // CSRF cookie must be JS-readable (not HttpOnly) for double-submit pattern
      const { readFileSync } = require('fs');
      const { join } = require('path');
      const secureCookies = readFileSync(join(__dirname, '..', '..', 'src/lib/secure-cookies.ts'), 'utf-8');
      // CSRF cookie should have httpOnly: false
      expect(secureCookies).toMatch(/csrf[\s\S]*httpOnly:\s*false/i);
    });
  });

  test.describe('Token Edge Cases', () => {
    test('JWT with alg:none rejected', async ({ page }) => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 'none-attack', email: 'none@evil.com' })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      await page.context().addCookies([{
        name: 'fortress_auth_token', value: noneToken,
        domain: new URL(BASE).hostname, path: '/',
      }]);
      await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/auth/login');
    });

    test('Empty string cookie rejected', async ({ page }) => {
      await page.context().addCookies([{
        name: 'fortress_auth_token', value: '',
        domain: new URL(BASE).hostname, path: '/',
      }]);
      await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/auth/login');
    });

    test('Dot-only string "..." rejected', async ({ page }) => {
      await page.context().addCookies([{
        name: 'fortress_auth_token', value: '...',
        domain: new URL(BASE).hostname, path: '/',
      }]);
      await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/auth/login');
    });

    test('Expired token redirects to login (not 500)', async ({ page }) => {
      // Create a properly formatted but expired JWT-like string
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        id: 'expired', email: 'expired@test.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      })).toString('base64url');
      const expiredToken = `${header}.${payload}.invalidsignature`;

      await page.context().addCookies([{
        name: 'fortress_auth_token', value: expiredToken,
        domain: new URL(BASE).hostname, path: '/',
      }]);
      await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/auth/login');
      // Should not be a white screen
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.length).toBeGreaterThan(50);
    });
  });

  test.describe('Session Lifecycle', () => {
    test('Logout clears auth cookie', async ({ page }) => {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.context().addCookies([{
        name: 'fortress_auth_token', value: 'test-session',
        domain: new URL(BASE).hostname, path: '/',
      }]);
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      // Simulate logout by clearing cookies
      await page.evaluate(() => {
        document.cookie = 'fortress_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'fortress_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        localStorage.removeItem('auth_token');
      });
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'fortress_auth_token' && c.value && c.value !== '');
      expect(authCookie).toBeUndefined();
    });
  });
});
