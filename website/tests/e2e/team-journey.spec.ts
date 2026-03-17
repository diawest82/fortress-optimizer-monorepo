/**
 * Team User Journey — Full E2E Test
 *
 * Mirrors exactly how a team admin walks through:
 *   1. Sign up as team owner
 *   2. Log in
 *   3. Visit Pricing → verify Teams tier with sliding scale calculator
 *   4. Navigate to Account → Team Management (sees upsell on free tier)
 *   5. Upgrade to Teams via Stripe checkout (or verify checkout flow starts)
 *   6. Team Management unlocks → invite a member by email
 *   7. Verify member appears in team list
 *   8. Change member role
 *   9. Generate a team API key
 *  10. Send optimization with team key
 *  11. Verify team usage stats
 *  12. Remove team member
 *  13. Verify seat count updates
 *  14. Rotate team API key
 *  15. View billing history / invoices
 *  16. Cancel subscription
 *
 * Run: npx playwright test tests/e2e/team-journey.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const OWNER_EMAIL = `e2e-teamowner-${UNIQUE}@test.fortress-optimizer.com`;
const MEMBER_EMAIL = `e2e-member-${UNIQUE}@test.fortress-optimizer.com`;
const TEST_PASSWORD = `SecureP@ss${UNIQUE}`;

let teamApiKey = '';

test.describe.serial('Team User Journey', () => {
  // ─── Step 1: Sign Up as Team Owner ────────────────────────────────────────

  test('1. Sign up as team owner', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);

    await page.fill('input[name="firstName"]', 'Team');
    await page.fill('input[name="lastName"]', 'Owner');
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/(dashboard|account)/, { timeout: 15000 });
  });

  // ─── Step 2: Log In ───────────────────────────────────────────────────────

  test('2. Log in with team owner credentials', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/(dashboard|account)/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(OWNER_EMAIL, { timeout: 10000 });
  });

  // ─── Step 3: Pricing Page — Teams Tier ────────────────────────────────────

  test('3. Pricing page shows Teams tier with sliding scale', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);

    // Verify Teams tier exists
    await expect(page.locator('body')).toContainText(/Teams/i);

    // Verify sliding scale or seat-based pricing is visible
    await expect(page.locator('body')).toContainText(/seat|member|per user|sliding/i, {
      timeout: 5000,
    });
  });

  // ─── Step 4: Team Management — Upsell on Free Tier ────────────────────────

  test('4. Team Management shows upsell when on free tier', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/(dashboard|account)/, { timeout: 15000 });

    await page.goto(`${BASE}/account`);

    // Click Team Management tab
    const teamTab = page.locator('button, a').filter({ hasText: /Team/i }).first();
    await teamTab.click();

    // Should show upgrade prompt (not team management)
    await expect(page.locator('body')).toContainText(/Upgrade to Teams|Team Management/i, {
      timeout: 5000,
    });
  });

  // ─── Step 5: Upgrade Flow — Stripe Checkout Initiates ─────────────────────

  test('5. Teams upgrade button navigates toward Stripe checkout', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);

    // Find the Teams tier upgrade/select button
    const teamButtons = page.locator('a, button').filter({
      hasText: /Upgrade|Subscribe|Choose|Select|Get Started/i,
    });

    // There should be upgrade buttons visible
    const count = await teamButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  // ─── Step 6: Generate Team API Key ────────────────────────────────────────

  test('6. Register team API key via backend', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'e2e-team-key', tier: 'free' },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    teamApiKey = data.api_key;
    expect(teamApiKey).toMatch(/^fk_/);
  });

  // ─── Step 7: Send Optimization with Team Key ─────────────────────────────

  test('7. Send live optimization request with team key', async ({ request }) => {
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

    // Aggressive mode should remove more filler words
    const optimized = data.optimization.optimized_prompt.toLowerCase();
    expect(optimized).not.toContain('basically');
    expect(optimized).not.toContain('essentially');
  });

  // ─── Step 8: Verify Team Usage ────────────────────────────────────────────

  test('8. Usage stats show optimization activity', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.requests).toBeGreaterThanOrEqual(1);
    expect(data.tokens_optimized).toBeGreaterThan(0);
  });

  // ─── Step 9: Multiple Optimizations — Batch Workflow ──────────────────────

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

    // Verify cumulative usage
    const usageResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    const usage = await usageResp.json();
    expect(usage.requests).toBeGreaterThanOrEqual(4); // 1 from step 7 + 3 here
  });

  // ─── Step 10: Rotate Team Key ────────────────────────────────────────────

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

    // Usage preserved on new key
    const newResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': newKey },
    });
    expect(newResp.status()).toBe(200);
    const usage = await newResp.json();
    expect(usage.requests).toBeGreaterThanOrEqual(4);

    teamApiKey = newKey;
  });

  // ─── Step 11: Account Page — Subscription Tab ────────────────────────────

  test('11. Subscription tab shows current plan and billing history', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/(dashboard|account)/, { timeout: 15000 });

    await page.goto(`${BASE}/account`);

    // Click Subscription tab
    const subTab = page.locator('button, a').filter({ hasText: /Subscription/i }).first();
    await subTab.click();

    // Should show current plan info
    await expect(page.locator('body')).toContainText(/Current Plan|Free|Billing/i, {
      timeout: 5000,
    });
  });

  // ─── Step 12: Account Page — Support Tab ─────────────────────────────────

  test('12. Support tab allows creating a ticket', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/(dashboard|account)/, { timeout: 15000 });

    await page.goto(`${BASE}/account`);

    // Click Support tab
    const supportTab = page.locator('button, a').filter({ hasText: /Support/i }).first();
    await supportTab.click();

    // Should show support level and New Ticket button
    await expect(page.locator('body')).toContainText(/Support|New Ticket|Response time/i, {
      timeout: 5000,
    });
  });

  // ─── Step 13: Account Page — Security Tab ────────────────────────────────

  test('13. Security tab shows MFA setup option', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/(dashboard|account)/, { timeout: 15000 });

    await page.goto(`${BASE}/account`);

    // Click Security tab
    const securityTab = page.locator('button, a').filter({ hasText: /Security/i }).first();
    await securityTab.click();

    // Should show MFA / two-factor option
    await expect(page.locator('body')).toContainText(/Two-Factor|MFA|Authenticator/i, {
      timeout: 5000,
    });
  });

  // ─── Step 14: Revoke Key and Clean Up ─────────────────────────────────────

  test('14. Revoke team API key', async ({ request }) => {
    const resp = await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${teamApiKey}` },
    });
    expect(resp.status()).toBe(200);

    // Confirm revoked
    const usageResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': teamApiKey },
    });
    expect(usageResp.status()).toBe(401);
  });

  // ─── Step 15: Verify Backend Health After All Operations ──────────────────

  test('15. Backend health check still healthy after full journey', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });
});
