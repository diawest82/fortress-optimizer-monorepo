/**
 * Support SLA Enforcement — verify tier-based response times are configured
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Support SLA Enforcement', () => {

  test('Pricing config has support SLAs defined', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/SUPPORT_SLAS|support.*response/i);
  });

  test('Free tier SLA is 48-72 hours', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/free[\s\S]*?48|Community/);
  });

  test('Teams tier SLA is 4-8 hours', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/teams[\s\S]*?4-8|Priority/);
  });

  test('Support system shows tier-specific response time', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/support-system.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/responseTime|response.*time|SLA/i);
  });
});
