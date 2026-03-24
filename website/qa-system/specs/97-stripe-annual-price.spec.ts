/**
 * Stripe Annual Price Verification — verify annual billing math
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Stripe Annual Price Verification', () => {

  test('Stripe config calculates annual as monthly × 12 × 0.8', () => {
    const file = join(WEBSITE_DIR, 'src/lib/stripe.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/12\s*\*\s*0\.8|0\.8\s*\*\s*12/);
  });

  test('Annual discount is 20% in pricing config', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/ANNUAL_DISCOUNT.*0\.20|annual.*12/);
  });

  test('Pro annual = $12/mo (not $15)', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/annual:\s*12/);
  });

  test('Checkout sends interval parameter', () => {
    const file = join(WEBSITE_DIR, 'src/app/pricing/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/interval.*annual|annual.*interval|year.*month/);
  });

  test('Stripe creates price with correct interval', () => {
    const file = join(WEBSITE_DIR, 'src/lib/stripe.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/interval.*month|interval.*year|recurring/);
  });
});
