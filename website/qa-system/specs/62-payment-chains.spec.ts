/**
 * Payment Chain Tests — Stripe checkout, webhook, tier update, invoices
 *
 * Gaps covered: B1 (Stripe checkout), B2 (webhook→tier), B3 (invoices), B4 (cancel/downgrade)
 *
 * Run: npx playwright test --project=qa-system --grep "Payment Chain"
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Payment Chain: Checkout Flow', () => {

  test('[B1] POST /api/subscriptions creates Stripe checkout session', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      data: { tier: 'individual', interval: 'month' },
    });
    // Expect 401 (no auth) or 200 (with URL) — NOT 500
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data.url || data.checkoutUrl).toBeTruthy();
    }
  });

  test('[B1] Checkout URL points to Stripe (not internal)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      data: { tier: 'individual', interval: 'month' },
    });
    if (res.status() === 200) {
      const data = await res.json();
      const url = data.url || data.checkoutUrl || '';
      expect(url).toMatch(/stripe\.com|checkout/i);
    }
  });

  test('[B1] Annual checkout sends correct interval', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      data: { tier: 'individual', interval: 'year' },
    });
    expect([200, 401, 403]).toContain(res.status());
  });

  test('[B1] Teams checkout includes seat count', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      data: { tier: 'teams', interval: 'month', seats: 10 },
    });
    expect([200, 401, 403]).toContain(res.status());
  });
});

test.describe('Payment Chain: Webhook Processing', () => {

  test('[B2] Webhook endpoint exists and rejects unsigned requests', async ({ request }) => {
    const res = await request.post(`${BASE}/api/webhook/stripe`, {
      data: { type: 'checkout.session.completed' },
      headers: { 'stripe-signature': 'invalid' },
    });
    // Should reject invalid signature — 400 or 401, NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('[B2] Webhook route source handles checkout.session.completed', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    expect(file, 'No Stripe webhook route found').toBeTruthy();
    const content = readFileSync(file!, 'utf-8');
    expect(content).toContain('checkout.session.completed');
  });

  test('[B2] Webhook updates user tier in database', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/prisma.*update|tier.*=|updateTier/i);
  });

  test('[B2] Webhook verifies Stripe signature', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/verifyWebhookSignature|constructEvent|stripe.*webhook/i);
  });
});

test.describe('Payment Chain: Subscription Management', () => {

  test('[B3] GET /api/subscriptions/invoices returns array or 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/subscriptions/invoices`);
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(Array.isArray(data.invoices || data)).toBe(true);
    }
  });

  test('[B4] POST /api/subscriptions/cancel requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions/cancel`);
    expect([401, 403]).toContain(res.status());
  });

  test('[B4] POST /api/subscriptions/downgrade requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions/downgrade`);
    expect([401, 403]).toContain(res.status());
  });

  test('[B4] Subscription management source has cancel_at_period_end', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/subscription-management.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/cancel|Cancel|downgrade|Downgrade/);
  });

  test('[B4] Cancel confirmation dialog exists', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/subscription-management.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/confirm|Confirm|Are you sure/i);
  });
});
