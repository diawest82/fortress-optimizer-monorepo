import { test, expect } from '@playwright/test';

const BASE = 'https://www.fortress-optimizer.com';

test.describe('Public Pages', () => {
  test('homepage loads and has key content', async ({ page }) => {
    const resp = await page.goto(BASE);
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveTitle(/Fortress/i);
  });

  test('pricing page loads with tier information', async ({ page }) => {
    const resp = await page.goto(`${BASE}/pricing`);
    expect(resp?.status()).toBe(200);
    await expect(page.locator('body')).toContainText(/free|pro|team|enterprise/i);
  });

  test('login page loads', async ({ page }) => {
    const resp = await page.goto(`${BASE}/login`);
    expect(resp?.status()).toBeLessThan(500);
  });

  test('signup page loads', async ({ page }) => {
    const resp = await page.goto(`${BASE}/signup`);
    expect(resp?.status()).toBeLessThan(500);
  });
});

test.describe('Auth Guards', () => {
  test('dashboard does not return 500', async ({ page }) => {
    const resp = await page.goto(`${BASE}/dashboard`);
    expect(resp?.status()).toBeLessThan(500);
  });
});

test.describe('API Health', () => {
  test('backend health endpoint returns healthy', async ({ request }) => {
    const resp = await request.get('https://api.fortress-optimizer.com/health');
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toMatch(/healthy|ok/);
    expect(data.database).toBe('connected');
  });

  test('pricing API returns tiers', async ({ request }) => {
    const resp = await request.get('https://api.fortress-optimizer.com/api/pricing');
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.tiers).toBeDefined();
  });
});
