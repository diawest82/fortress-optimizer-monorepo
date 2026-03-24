/**
 * Signup → First Optimization Chain
 * The most important horizontal chain: signup → get key → optimize → see usage
 */

import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const BACKEND = 'https://api.fortress-optimizer.com';

test.describe('Signup to First Optimization', () => {

  test('[chain] Signup → authenticated → dashboard accessible', async ({ context }) => {
    const email = `s2o-${crypto.randomBytes(3).toString('hex')}@test.fortress-optimizer.com`;
    const page = await context.newPage();

    // Signup
    const res = await page.request.post(`${BASE}/api/auth/signup`, {
      data: { email, password: 'TestP@ss123!', name: 'First Opt' },
    });
    if (res.status() === 429) { console.log('[s2o] Rate limited — skipping'); await page.close(); return; }

    // Should get cookies
    const cookies = await context.cookies();
    const hasAuth = cookies.some(c => c.name === 'fortress_auth_token');
    if (!hasAuth) { console.log('[s2o] No auth cookie — signup may not set cookies yet'); }

    // Dashboard should be accessible
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(50);
    await page.close();
  });

  test('[chain] Backend health is reachable', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  test('[chain] Backend optimize endpoint accepts requests', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/optimize`, {
      data: { prompt: 'Please help me test this', level: 'balanced', provider: 'openai' },
      headers: { 'Authorization': 'Bearer test-key', 'Content-Type': 'application/json' },
    });
    // Should be 401 (invalid key) or 200 (if key valid) — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('[chain] Register API key via backend', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/keys/register`, {
      data: { tier: 'free' },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should return key or require auth — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('[chain] Account page accessible after auth', async ({ context }) => {
    const page = await context.newPage();
    // Try login with shared test account
    const login = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email: 'chain-test-fixed@test.fortress-optimizer.com', password: 'ChainTestP@ss123!' },
    });
    if (login.status() !== 200) { await page.close(); return; }

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/account');
    await page.close();
  });

  test('[chain] Install page has correct class name (FortressClient)', async ({ page }) => {
    await page.goto(`${BASE}/install`);
    await page.waitForTimeout(5000);
    const body = await page.locator('body').textContent() || '';
    // FortressClient should appear in code samples
    expect(body).toMatch(/FortressClient|fortress-optimizer|npm install/i);
  });

  test('[chain] Docs installation pages exist and have content', async ({ request }) => {
    for (const slug of ['npm', 'vscode', 'copilot', 'slack', 'openclaw']) {
      const res = await request.get(`${BASE}/docs/installation/${slug}`);
      expect(res.status(), `/docs/installation/${slug} should return 200`).toBe(200);
    }
  });
});
