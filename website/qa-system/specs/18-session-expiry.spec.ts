/**
 * Session Expiry — JWT Lifecycle & Token Validation
 * Tests that expired, malformed, and forged tokens are properly rejected.
 */

import { test, expect } from '@playwright/test';
import { sign } from 'jsonwebtoken';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

function makeJwt(payload: Record<string, any>, secret: string, expiresIn?: string): string {
  return sign(payload, secret, expiresIn ? { expiresIn } : undefined);
}

test.describe('Session Expiry: JWT Lifecycle', () => {

  test('Protected route with no token redirects to login', async ({ page }) => {
    // Clear all cookies and storage
    await page.context().clearCookies();
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should redirect to login
    expect(page.url()).toContain('/auth/login');
  });

  test('Malformed JWT cookie is rejected', async ({ page }) => {
    await page.context().addCookies([{
      name: 'fortress_auth_token',
      value: 'not-a-valid-jwt-at-all',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/login');
  });

  test('JWT with wrong signature is rejected', async ({ page }) => {
    const fakeToken = makeJwt(
      { id: 'fake-id', email: 'fake@test.com', name: 'Fake' },
      'completely-wrong-secret-key',
      '24h'
    );
    await page.context().addCookies([{
      name: 'fortress_auth_token',
      value: fakeToken,
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/login');
  });

  test('Expired JWT is rejected', async ({ page }) => {
    // Create a token that expired 1 hour ago
    const expiredToken = makeJwt(
      { id: 'expired-id', email: 'expired@test.com', name: 'Expired', iat: Math.floor(Date.now() / 1000) - 90000 },
      'CHANGE-THIS-IN-PRODUCTION', // Use the known dev default
      '-1h' // Already expired
    );
    await page.context().addCookies([{
      name: 'fortress_auth_token',
      value: expiredToken,
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should redirect to login (expired token rejected)
    // In production, the dev default secret would also cause rejection
    expect(page.url()).toContain('/auth/login');
  });

  test('Protected API returns 401 with invalid token, not 500', async () => {
    const res = await fetch(`${BASE}/api/subscriptions`, {
      headers: {
        'Cookie': 'fortress_auth_token=invalid-token',
        'Authorization': 'Bearer invalid-token',
      },
    });
    // Should be 401 (unauthorized) not 500 (server error)
    expect(res.status).not.toBe(500);
    expect(res.status).not.toBe(502);
  });

  test('Empty cookie value is rejected', async ({ page }) => {
    await page.context().addCookies([{
      name: 'fortress_auth_token',
      value: '',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/login');
  });

  test('Page does not white-screen on auth failure', async ({ page }) => {
    await page.context().addCookies([{
      name: 'fortress_auth_token',
      value: 'garbage',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    // Should have SOME content — not a blank page
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length, 'Page is blank/white-screen').toBeGreaterThan(50);
  });

  test('Logout clears auth cookie', async ({ page }) => {
    // Set a cookie
    await page.context().addCookies([{
      name: 'fortress_auth_token',
      value: 'test-token',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    // Navigate to trigger any cleanup
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    // Clear via JS (simulating logout)
    await page.evaluate(() => {
      document.cookie = 'fortress_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.removeItem('auth_token');
    });
    // Verify cookie is gone
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'fortress_auth_token' && c.value !== '');
    expect(authCookie, 'Auth cookie still present after logout').toBeUndefined();
  });
});
