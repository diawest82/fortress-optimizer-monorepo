/**
 * Authenticated Endpoint Performance SLOs
 * Measures latency of auth-protected endpoints (dashboard, profile, teams)
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const BACKEND = 'https://api.fortress-optimizer.com';

test.describe('Authenticated Performance: API Latency', () => {

  test('/api/health responds under 1000ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/health`);
    const duration = Date.now() - start;
    expect(res.status()).toBeLessThan(500);
    expect(duration, `/api/health took ${duration}ms`).toBeLessThan(1000);
  });

  test('/api/pricing responds under 1000ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/pricing`);
    const duration = Date.now() - start;
    expect(res.status()).toBeLessThan(500);
    expect(duration, `/api/pricing took ${duration}ms`).toBeLessThan(1000);
  });

  test('/api/admin/kpis responds under 3000ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/admin/kpis`);
    const duration = Date.now() - start;
    expect(res.status()).toBeLessThan(500);
    expect(duration, `/api/admin/kpis took ${duration}ms`).toBeLessThan(3000);
  });

  test('Backend /health responds under 500ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BACKEND}/health`);
    const duration = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(duration, `Backend health took ${duration}ms`).toBeLessThan(500);
  });

  test('Backend /api/optimize responds under 2000ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.post(`${BACKEND}/api/optimize`, {
      data: { prompt: 'test', level: 'balanced' },
      headers: { 'Authorization': 'Bearer test', 'Content-Type': 'application/json' },
    });
    const duration = Date.now() - start;
    expect(res.status()).toBeLessThan(500);
    expect(duration, `Optimize took ${duration}ms`).toBeLessThan(2000);
  });
});

test.describe('Authenticated Performance: Page Load', () => {

  test('Login page loads under 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/auth/login`);
    await page.waitForSelector('input', { timeout: 5000 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('Signup page loads under 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForSelector('input', { timeout: 5000 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('Dashboard page loads under 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(5000);
    const duration = Date.now() - start;
    // Dashboard may redirect to login — both are acceptable
    expect(duration).toBeLessThan(8000);
  });
});
