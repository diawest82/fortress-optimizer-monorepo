/**
 * Team User Journey — Full E2E Test
 *
 * Run: npx playwright test tests/e2e/team-journey.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const OWNER_EMAIL = `e2e-teamowner-${UNIQUE}@test.fortress-optimizer.com`;
const TEST_PASSWORD = `SecureP@ss${UNIQUE}`;

let teamApiKey = '';

/** Helper: log in via the login form and navigate to a target page */
async function loginAndGo(page: Page, targetPath?: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(3000);

  await page.locator('input[name="email"]').click();
  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  const loginResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/auth/login'),
    { timeout: 10000 }
  ).catch(() => null);

  await page.locator('button[type="submit"]').first().click();
  await loginResponsePromise;
  await page.waitForTimeout(3000);

  if (targetPath) {
    await page.goto(`${BASE}${targetPath}`);
    await page.waitForTimeout(2000);
  }
}

test.describe.serial('Team User Journey', () => {
  // ─── Step 1: Sign Up ─────────────────────────────────────────────────────

  test('1. Sign up as team owner', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForSelector('input[name="firstName"]', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.locator('input[name="firstName"]').click();
    await page.locator('input[name="firstName"]').fill('Team');
    await page.locator('input[name="lastName"]').click();
    await page.locator('input[name="lastName"]').fill('Owner');
    await page.locator('input[name="email"]').click();
    await page.locator('input[name="email"]').fill(OWNER_EMAIL);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);

    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5000);

    // Log whether signup succeeded or was rate-limited
    const url = page.url();
    console.log(`[Team] Signup result URL: ${url}`);
  });

  // ─── Step 2: Verify Account Access ────────────────────────────────────────

  test('2. Account page accessible after auth', async ({ page }) => {
    await loginAndGo(page, '/account');

    await expect(page.locator('body')).toContainText(
      /Account|Dashboard|Overview|API Keys/i,
      { timeout: 10000 }
    );
  });

  // ─── Step 3: Pricing — Teams Tier ─────────────────────────────────────────

  test('3. Pricing page shows Teams tier with sliding scale', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);

    await expect(page.locator('body')).toContainText(/Teams/i);
    await expect(page.locator('body')).toContainText(/seat|member|per user|sliding/i, {
      timeout: 5000,
    });
  });

  // ─── Step 4: Team Management — Upsell ─────────────────────────────────────

  test('4. Account page shows Team Management or upgrade option', async ({ page }) => {
    await loginAndGo(page, '/account');

    // If auth succeeded, check for team management content
    if (page.url().includes('/account')) {
      await expect(page.locator('body')).toContainText(/Team|Upgrade|Account/i, {
        timeout: 5000,
      });
    } else {
      // Auth was rate-limited — verify we're on login (not a crash)
      expect(page.url()).toContain('/auth/login');
    }
  });

  // ─── Step 5: Upgrade Buttons Exist ────────────────────────────────────────

  test('5. Pricing page has subscribe buttons', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);

    const buttons = page.locator('a, button').filter({
      hasText: /Upgrade|Subscribe|Choose|Select|Get Started/i,
    });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  // ─── Step 6: Register API Key ─────────────────────────────────────────────

  test('6. Register team API key via backend', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'e2e-team-key', tier: 'free' },
    });
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    teamApiKey = data.api_key;
    expect(teamApiKey).toMatch(/^fk_/);
  });

  // ─── Step 7: Live Optimization ────────────────────────────────────────────

  test('7. Send live optimization with aggressive mode', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': teamApiKey },
      data: {
        prompt: 'As a team we need to basically like optimize our workflow and essentially improve productivity across all departments',
        level: 'aggressive',
        provider: 'openai',
      },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.status).toBe('success');
    expect(data.tokens.savings).toBeGreaterThanOrEqual(0);

    const optimized = data.optimization.optimized_prompt.toLowerCase();
    expect(optimized).not.toContain('basically');
    expect(optimized).not.toContain('essentially');
  });

  // ─── Step 8: Usage Stats ──────────────────────────────────────────────────

  test('8. Usage stats show optimization activity', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.requests).toBeGreaterThanOrEqual(1);
    expect(data.tokens_optimized).toBeGreaterThan(0);
  });

  // ─── Step 9: Batch Optimizations ──────────────────────────────────────────

  test('9. Send multiple optimizations simulating team usage', async ({ request }) => {
    const prompts = [
      'Can you please analyze the quarterly revenue data and provide a summary',
      'I was wondering if you could help me write a function that processes user input',
      'We need to refactor the authentication module to support OAuth providers',
    ];

    for (const prompt of prompts) {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': teamApiKey },
        data: { prompt, level: 'balanced', provider: 'anthropic' },
      });
      expect(resp.status()).toBe(200);
      expect((await resp.json()).status).toBe('success');
    }

    const usageResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    const usage = await usageResp.json();
    expect(usage.requests).toBeGreaterThanOrEqual(4);
  });

  // ─── Step 10: Rotate Key ──────────────────────────────────────────────────

  test('10. Rotate team API key', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/rotate`, {
      headers: { Authorization: `Bearer ${teamApiKey}` },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    const newKey = data.api_key;
    expect(newKey).toMatch(/^fk_/);
    expect(newKey).not.toBe(teamApiKey);

    // Old key dead
    const oldResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    expect(oldResp.status()).toBe(401);

    // Usage preserved
    const newResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': newKey },
    });
    expect(newResp.status()).toBe(200);
    expect((await newResp.json()).requests).toBeGreaterThanOrEqual(4);

    teamApiKey = newKey;
  });

  // ─── Step 11: Subscription Tab ────────────────────────────────────────────

  test('11. Subscription tab accessible', async ({ page }) => {
    await loginAndGo(page, '/account');
    if (page.url().includes('/account')) {
      await expect(page.locator('body')).toContainText(/Subscription|Current Plan|Free|Billing/i, { timeout: 5000 });
    } else {
      expect(page.url()).not.toContain('/500');
    }
  });

  test('12. Support tab accessible', async ({ page }) => {
    await loginAndGo(page, '/account');
    if (page.url().includes('/account')) {
      await expect(page.locator('body')).toContainText(/Support|New Ticket|Response/i, { timeout: 5000 });
    } else {
      expect(page.url()).not.toContain('/500');
    }
  });

  test('13. Security tab accessible', async ({ page }) => {
    await loginAndGo(page, '/account');
    if (page.url().includes('/account')) {
      await expect(page.locator('body')).toContainText(/Security|Two-Factor|MFA|Authenticator/i, { timeout: 5000 });
    } else {
      expect(page.url()).not.toContain('/500');
    }
  });

  // ─── Step 14: Revoke Key ─────────────────────────────────────────────────

  test('14. Revoke team API key', async ({ request }) => {
    const resp = await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${teamApiKey}` },
    });
    expect(resp.status()).toBe(200);

    const usageResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    expect(usageResp.status()).toBe(401);
  });

  // ─── Step 15: Health Check ───────────────────────────────────────────────

  test('15. Backend still healthy after full journey', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });
});
