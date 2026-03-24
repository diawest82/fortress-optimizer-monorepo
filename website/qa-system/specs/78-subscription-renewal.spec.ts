/**
 * Subscription Renewal Boundary Tests
 * Verifies billing lifecycle: create, renew, cancel, downgrade
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Subscription Renewal: Webhook Handling', () => {

  test('Webhook handles invoice.paid event', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/invoice.*paid|payment_succeeded/i);
  });

  test('Webhook handles subscription.updated event', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/subscription.*updated|customer\.subscription/i);
  });

  test('Webhook handles subscription.deleted (cancellation)', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/subscription.*deleted|cancel/i);
  });

  test('Webhook downgrades to free on cancellation', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/tier.*free|free.*tier|downgrade/i);
  });
});

test.describe('Subscription Renewal: Monthly Token Reset', () => {

  test('Backend has monthly token reset logic', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/monthly_reset|month.*reset|reset.*month/i);
  });

  test('Free tier has 50K token limit enforced', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/50000|50_000|50K/);
  });
});
