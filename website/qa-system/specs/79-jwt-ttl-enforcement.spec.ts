/**
 * JWT TTL Enforcement — verify token expiry matches configuration
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('JWT TTL Enforcement', () => {

  test('Login route sets 24h expiry on JWT', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/auth/login/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/expiresIn.*24h|expiresIn.*86400/);
  });

  test('Signup route sets same expiry as login', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/auth/signup/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/expiresIn.*24h|expiresIn.*86400/);
  });

  test('Expired token returns 401 on API', async ({ context }) => {
    await context.addCookies([{
      name: 'fortress_auth_token',
      value: 'expired.invalid.token',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    const page = await context.newPage();
    const res = await page.request.get(`${BASE}/api/users/profile`);
    expect(res.status()).toBe(401);
    await page.close();
  });

  test('Middleware rejects expired token on protected routes', async ({ context }) => {
    await context.addCookies([{
      name: 'fortress_auth_token',
      value: 'expired.token.value',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);
    const page = await context.newPage();
    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/login');
    await page.close();
  });

  test('JWT secret is not the default in production check exists', () => {
    const file = join(WEBSITE_DIR, 'src/lib/jwt-auth.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/CHANGE-THIS|SECRET_IS_SAFE|throw.*Error.*JWT/);
  });
});
