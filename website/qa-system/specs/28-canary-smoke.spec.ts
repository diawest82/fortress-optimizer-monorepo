/**
 * Canary Smoke — Ultra-Fast Post-Deploy Health Check
 * Target: < 30 seconds total. Run after every deploy.
 * If ANY of these fail, the deploy is broken.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

test.describe('Canary Smoke: Post-Deploy Health', () => {
  test('Homepage returns 200', async () => {
    const res = await fetch(BASE);
    expect(res.status).toBe(200);
  });

  test('Website /api/health returns healthy + DB connected', async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toMatch(/healthy/i);
    expect(data.DATABASE).toMatch(/connected/i);
  });

  test('Backend /health returns healthy', async () => {
    const res = await fetch(`${API_BASE}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  test('Login page renders form', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 5000 });
  });

  test('Signup page renders form', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 5000 });
  });

  test('Pricing page renders tiers', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText('Free', { timeout: 10000 });
    await expect(page.locator('body')).toContainText('Pro', { timeout: 5000 });
  });

  test('/docs/getting-started returns 200', async () => {
    const res = await fetch(`${BASE}/docs/getting-started`);
    expect(res.status).toBe(200);
  });

  test('Backend /api/optimize endpoint responds', async () => {
    const res = await fetch(`${API_BASE}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', level: 'balanced', provider: 'openai' }),
    });
    // Should get 401 (no auth) or 200 — NOT 500
    expect(res.status).not.toBe(500);
    expect(res.status).not.toBe(502);
    expect(res.status).not.toBe(503);
  });
});
