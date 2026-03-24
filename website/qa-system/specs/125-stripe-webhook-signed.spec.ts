/**
 * Stripe Webhook with Valid Signature — test webhook processing
 * Uses STRIPE_WEBHOOK_SECRET to sign test payloads.
 */

import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

function signPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test.describe('Stripe Webhook Signed', () => {

  test('Webhook with valid signature is accepted (not 401/403)', async ({ request }) => {
    if (!WEBHOOK_SECRET) { console.log('[webhook] No STRIPE_WEBHOOK_SECRET — skipping'); return; }

    const payload = JSON.stringify({
      id: 'evt_test_signed',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_signed',
          customer: 'cus_test',
          subscription: 'sub_test',
          metadata: { tier: 'individual', userId: 'test-user' },
        },
      },
    });

    const signature = signPayload(payload, WEBHOOK_SECRET);

    const res = await request.post(`${BASE}/api/webhook/stripe`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });

    console.log(`[webhook] Signed request returned: ${res.status()}`);
    // With valid signature, should be 200 (processed) or 400 (event not recognized)
    // Should NOT be 401/403 (signature rejected)
    // May be 500 if event processing fails (no real customer) — that's acceptable
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('Webhook with tampered payload is rejected', async ({ request }) => {
    if (!WEBHOOK_SECRET) return;

    const originalPayload = JSON.stringify({ type: 'checkout.session.completed', id: 'evt_tamper' });
    const signature = signPayload(originalPayload, WEBHOOK_SECRET);

    // Send DIFFERENT payload than what was signed
    const tamperedPayload = JSON.stringify({ type: 'checkout.session.completed', id: 'evt_TAMPERED' });

    const res = await request.post(`${BASE}/api/webhook/stripe`, {
      data: tamperedPayload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });

    // Tampered payload should be rejected
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Webhook with expired timestamp is rejected', async ({ request }) => {
    if (!WEBHOOK_SECRET) return;

    const payload = JSON.stringify({ type: 'test', id: 'evt_expired' });
    // Sign with timestamp from 10 minutes ago (Stripe rejects >5 min)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const signedPayload = `${oldTimestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(signedPayload).digest('hex');
    const header = `t=${oldTimestamp},v1=${signature}`;

    const res = await request.post(`${BASE}/api/webhook/stripe`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': header,
      },
    });

    // Expired timestamp should be rejected
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
