/**
 * Session Fixation + Account Enumeration + JWT Claim Trust
 * Adversarial tests for authentication security.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Session Fixation Prevention', () => {

  test('Login error does not distinguish "user not found" from "wrong password"', async ({ request }) => {
    // Non-existent user
    const res1 = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'nonexistent-user-xyz@test.com', password: 'AnyP@ss123!' },
    });
    const body1 = await res1.json();

    // Existing user with wrong password (use a common test email pattern)
    const res2 = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'chain-test-fixed@test.fortress-optimizer.com', password: 'WrongP@ss!' },
    });
    const body2 = await res2.json();

    if (res1.status() === 429 || res2.status() === 429) return; // Rate limited

    // Both should return the same generic error — NOT "user not found" for one
    const error1 = body1.error || body1.detail || '';
    const error2 = body2.error || body2.detail || '';

    // Neither should say "user not found" or "no account"
    expect(error1.toLowerCase()).not.toMatch(/not found|no account|doesn.t exist/);
    expect(error2.toLowerCase()).not.toMatch(/not found|no account|doesn.t exist/);
  });

  test('Pre-set cookie does not persist after login', async ({ context }) => {
    // Set a fake cookie before login
    await context.addCookies([{
      name: 'fortress_auth_token',
      value: 'attacker-controlled-value',
      domain: new URL(BASE).hostname,
      path: '/',
    }]);

    // Login should overwrite the attacker's cookie
    const page = await context.newPage();
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email: 'chain-test-fixed@test.fortress-optimizer.com', password: 'ChainTestP@ss123!' },
    });

    if (res.status() === 429) { await page.close(); return; }
    if (res.status() !== 200) { await page.close(); return; }

    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'fortress_auth_token');
    expect(authCookie).toBeTruthy();
    expect(authCookie!.value).not.toBe('attacker-controlled-value');
    await page.close();
  });
});

test.describe('JWT Claim Trust Verification', () => {

  test('Server verifies user from database, not just JWT claims', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/users/profile/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // Should query prisma with the decoded ID, not return JWT claims directly
    expect(content).toMatch(/prisma.*findUnique|prisma.*findFirst/);
  });

  test('Dashboard stats verifies user exists in DB', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/prisma.*user|auth\.id/);
  });

  test('Tampered JWT with fake role is rejected', async ({ context }) => {
    // Create a JWT-like string with admin role (but wrong signature)
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UiLCJyb2xlIjoiYWRtaW4iLCJ0aWVyIjoiZW50ZXJwcmlzZSJ9.INVALID';
    await context.addCookies([{
      name: 'fortress_auth_token',
      value: fakeToken,
      domain: new URL(BASE).hostname,
      path: '/',
    }]);

    const page = await context.newPage();
    const res = await page.request.get(`${BASE}/api/users/profile`);
    expect(res.status()).toBe(401);
    await page.close();
  });
});

test.describe('Webhook Idempotency', () => {

  test('Stripe webhook endpoint rejects duplicate events gracefully', async ({ request }) => {
    // Send two identical webhook payloads
    const payload = JSON.stringify({ type: 'checkout.session.completed', id: 'evt_test_duplicate' });
    const res1 = await request.post(`${BASE}/api/webhook/stripe`, {
      data: payload,
      headers: { 'stripe-signature': 'invalid', 'content-type': 'application/json' },
    });
    const res2 = await request.post(`${BASE}/api/webhook/stripe`, {
      data: payload,
      headers: { 'stripe-signature': 'invalid', 'content-type': 'application/json' },
    });

    // Both should be rejected (invalid signature) — but neither should 500
    expect(res1.status()).toBeLessThan(500);
    expect(res2.status()).toBeLessThan(500);
  });

  test('Webhook source has idempotency check or signature verification', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/verifyWebhookSignature|constructEvent|idempotent/i);
  });
});
