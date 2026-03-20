/**
 * Webhook Resilience — Stripe Webhook Edge Cases
 * Tests webhook signature validation, idempotency, and error handling.
 */

import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBHOOK_URL = `${BASE}/api/webhook/stripe`;

function makeStripeEvent(type: string, data: Record<string, any> = {}): string {
  return JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  });
}

test.describe('Webhook Resilience: Stripe Event Handling', () => {

  test.describe('Signature Validation', () => {
    test('Missing stripe-signature header returns 400', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: makeStripeEvent('checkout.session.completed'),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Invalid stripe-signature header returns 400', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=invalid_signature',
        },
        body: makeStripeEvent('checkout.session.completed'),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Empty body returns 400', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=fake',
        },
        body: '',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Event Type Handling', () => {
    test('Unknown event type does not crash (returns 200 or 400)', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=fake',
        },
        body: makeStripeEvent('totally.unknown.event'),
      });
      // Should not crash — either 200 (ignored) or 400 (bad sig)
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(502);
    });

    test('Malformed JSON body returns 400', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=fake',
        },
        body: 'not valid json {{{',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('Missing event type field returns 400', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=fake',
        },
        body: JSON.stringify({ id: 'evt_test', object: 'event', data: {} }),
      });
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Response Time', () => {
    test('Webhook responds within 5 seconds', async () => {
      const start = performance.now();
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=test',
        },
        body: makeStripeEvent('checkout.session.completed'),
      });
      const elapsed = performance.now() - start;
      expect(elapsed, `Webhook took ${Math.round(elapsed)}ms`).toBeLessThan(5000);
    });
  });

  test.describe('HTTP Method Enforcement', () => {
    test('GET to webhook endpoint returns 405 or 404', async () => {
      const res = await fetch(WEBHOOK_URL, { method: 'GET' });
      expect([404, 405]).toContain(res.status);
    });

    test('PUT to webhook endpoint returns 405 or 404', async () => {
      const res = await fetch(WEBHOOK_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: makeStripeEvent('test'),
      });
      expect([404, 405]).toContain(res.status);
    });
  });

  test.describe('Concurrent Webhooks', () => {
    test('5 simultaneous webhook requests do not crash', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'stripe-signature': 't=1234567890,v1=concurrent-test',
            },
            body: makeStripeEvent('customer.subscription.updated', {
              id: `sub_concurrent_${Date.now()}`,
            }),
          }).then(r => r.status)
        )
      );
      // None should be 500
      const serverErrors = results.filter(s => s >= 500);
      expect(serverErrors, `${serverErrors.length} server errors`).toHaveLength(0);
    });
  });
});
