/**
 * Full Smoke After Deploy — abbreviated chain tests for post-deploy verification
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const BACKEND = 'https://api.fortress-optimizer.com';

test.describe('Post-Deploy Smoke: Core Pages', () => {

  test('Homepage loads', async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.status()).toBe(200);
  });

  test('Pricing loads', async ({ request }) => {
    const res = await request.get(`${BASE}/pricing`);
    expect(res.status()).toBe(200);
  });

  test('Login loads', async ({ request }) => {
    const res = await request.get(`${BASE}/auth/login`);
    expect(res.status()).toBe(200);
  });

  test('Signup loads', async ({ request }) => {
    const res = await request.get(`${BASE}/auth/signup`);
    expect(res.status()).toBe(200);
  });

  test('Docs loads', async ({ request }) => {
    const res = await request.get(`${BASE}/docs`);
    expect(res.status()).toBe(200);
  });

  test('Install loads', async ({ request }) => {
    const res = await request.get(`${BASE}/install`);
    expect(res.status()).toBe(200);
  });
});

test.describe('Post-Deploy Smoke: APIs', () => {

  test('Frontend health', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
  });

  test('Backend health', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  test('Pricing API', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pricing`);
    expect(res.status()).toBeLessThan(500);
  });

  test('Login API rejects bad creds (not 500)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'smoke@test.com', password: 'wrong' },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('Post-Deploy Smoke: Auth Flow', () => {

  test('Protected route redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/login');
  });

  test('Dashboard redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth/login');
  });
});
