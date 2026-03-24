/**
 * 136-pricing-update.spec.ts — Pricing Integrity + Honest Savings Claims
 *
 * Prices: $15 Pro, $60 Teams (launch pricing — adjust after 60 days with data)
 * Savings: "10-20%" (honest, based on real benchmark)
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE = join(__dirname, '..', '..');
const ROOT = join(WEBSITE, '..');

// ═══ Group 1: pricing-config.ts Source Values ═══

test.describe('Pricing Integrity: Config Values', () => {
  let config: string;
  test.beforeAll(() => { config = readFileSync(join(WEBSITE, 'src/lib/pricing-config.ts'), 'utf-8'); });

  test('[CONFIG-1] Pro monthly = $15', () => {
    expect(config).toMatch(/pro:[\s\S]*?monthly:\s*15\b/);
  });

  test('[CONFIG-2] Pro annual = $12 (20% off $15)', () => {
    expect(config).toMatch(/pro:[\s\S]*?annual:\s*12\b/);
  });

  test('[CONFIG-3] Teams base = $60', () => {
    expect(config).toMatch(/baseMonthly:\s*60\b/);
  });

  test('[CONFIG-4] Teams base seats = 5', () => {
    expect(config).toMatch(/baseSeats:\s*5\b/);
  });

  test('[CONFIG-5] Savings claim is "10-20%" range', () => {
    expect(config).toMatch(/SAVINGS_MIN.*10|savingsMin.*10/i);
    expect(config).toMatch(/SAVINGS_MAX.*20|savingsMax.*20/i);
    expect(config).toContain('10-20%');
  });

  test('[CONFIG-6] Annual discount = 20%', () => {
    expect(config).toMatch(/ANNUAL_DISCOUNT.*0\.20/);
  });
});

// ═══ Group 2: Cross-Surface Consistency ═══

test.describe('Pricing Integrity: Cross-Surface', () => {
  test('[CROSS-1] Cost calculator has $15 Pro', () => {
    const c = readFileSync(join(WEBSITE, 'src/components/tools/cost-calculator.tsx'), 'utf-8');
    expect(c).toMatch(/cost:\s*15/);
  });

  test('[CROSS-2] Chatbot mentions $15 Pro', () => {
    const c = readFileSync(join(WEBSITE, 'src/components/support-chatbot.tsx'), 'utf-8');
    expect(c).toContain('$15');
  });

  test('[CROSS-3] Backend fortress_types.py has $15 Pro', () => {
    const c = readFileSync(join(ROOT, 'shared-libs/fortress_types.py'), 'utf-8');
    expect(c).toMatch(/price_monthly.*15/);
  });

  test('[CROSS-4] Stripe uses pricing-config (not hardcoded)', () => {
    const c = readFileSync(join(WEBSITE, 'src/lib/stripe.ts'), 'utf-8');
    expect(c).toMatch(/PRICING\.pro\.monthly|pricing-config/);
  });

  test('[CROSS-5] Webhook labels have $15 Pro', () => {
    const c = readFileSync(join(WEBSITE, 'src/app/api/webhook/stripe/route.ts'), 'utf-8');
    expect(c).toContain('$15/month');
  });

  test('[CROSS-6] Docs show $15 Pro and $60 Teams', () => {
    const c = readFileSync(join(WEBSITE, 'src/app/docs/[...slug]/page.tsx'), 'utf-8');
    expect(c).toContain('$15');
    expect(c).toContain('$60');
  });
});

// ═══ Group 3: Honest Savings Claims (10-20%) ═══

test.describe('Pricing Integrity: Savings Claims', () => {
  test('[CLAIM-1] Homepage says "10-20%" (not flat 20%)', () => {
    const c = readFileSync(join(WEBSITE, 'src/app/page.tsx'), 'utf-8');
    expect(c).toMatch(/10[-–]20%/);
  });

  test('[CLAIM-2] Compare page says "10-20%"', () => {
    const c = readFileSync(join(WEBSITE, 'src/app/compare/client.tsx'), 'utf-8');
    expect(c).toMatch(/10[-–]20%/);
  });

  test('[CLAIM-3] Layout metadata says "10-20%"', () => {
    const c = readFileSync(join(WEBSITE, 'src/app/layout.tsx'), 'utf-8');
    expect(c).toMatch(/10[-–]20%/);
  });

  test('[CLAIM-4] Cost calculator shows "10-20%"', () => {
    const c = readFileSync(join(WEBSITE, 'src/components/tools/cost-calculator.tsx'), 'utf-8');
    expect(c).toContain('10-20%');
  });

  test('[CLAIM-5] No flat "20% savings" marketing claims in src/', () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `grep -rn "20%" ${join(WEBSITE, 'src/')} --include="*.ts" --include="*.tsx" | grep -v "10-20\\|up to 20\\|10 to 20\\|annual.*20\\|ANNUAL_DISCOUNT\\|0\\.20\\|__tests__\\|spec\\.ts\\|test-results\\|node_modules\\|savingsMax\\|SAVINGS_MAX" | grep -i "save\\|saving\\|cost\\|reduce\\|cut\\|token" || true`,
      { encoding: 'utf-8' }
    ).trim();
    const claims = result.split('\n').filter(l => l.trim());
    expect(claims.length, `Found flat "20%" claims:\n${claims.join('\n')}`).toBe(0);
  });
});

// ═══ Group 4: Live Page (only passes after deploy) ═══

test.describe('Pricing Integrity: Live Page', () => {
  test('[LIVE-1] Pricing page shows $15 for Pro', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body') || '';
    expect(body).toContain('$15');
  });

  test('[LIVE-2] Pricing page shows $60 for Teams', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body') || '';
    expect(body).toContain('$60');
  });

  test('[LIVE-3] Homepage shows "10-20%" savings', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body') || '';
    expect(body).toMatch(/10[-–]20%/);
  });
});
