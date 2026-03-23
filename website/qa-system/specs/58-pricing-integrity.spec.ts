/**
 * Pricing Integrity Agent — Catches Price Drift Across the Entire Codebase
 *
 * Instead of checking individual files, this spec greps the ENTIRE src/ directory
 * for pricing values and verifies they match the single source of truth
 * in pricing-config.ts.
 *
 * This catches the "$99 Teams" and "$9.99 Pro" bugs that slipped through
 * because individual tests only checked known files.
 *
 * Run: npx playwright test --project=qa-pricing-integrity
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// __dirname is qa-system/specs/ → go up to website/
const WEBSITE_DIR = join(__dirname, '..', '..');
const SRC_DIR = join(WEBSITE_DIR, 'src');
const BACKEND_DIR = join(WEBSITE_DIR, '..', 'backend');
const SHARED_DIR = join(WEBSITE_DIR, '..', 'shared-libs');

// Current correct values from pricing-config.ts
const CORRECT = {
  proMonthly: 15,
  proAnnual: 12,
  teamsBase: 60,
  teamsPerSeat: [12, 10, 8, 7, 6],
  freeTokens: 50000,
  savingsPercent: 20,
  platformCount: 12,
  corePlatforms: 5,
};

// Old/stale values that should NEVER appear
const STALE_PRICES = [
  { pattern: '\\$9\\.99', description: 'Old Pro price $9.99' },
  { pattern: '\\$29', description: 'Old Pro price $29' },
  { pattern: '\\$99[^0-9]', description: 'Old Teams price $99' },
  { pattern: 'price.*99[^0-9]', description: 'Hardcoded price: 99' },
  { pattern: '10K free', description: 'Old free tier: 10K (should be 50K)' },
  { pattern: '10,000 tokens', description: 'Old free tier: 10,000 tokens' },
  { pattern: '18%.*sav|sav.*18%', description: 'Wrong savings claim: 18% (should be 20%)' },
];

function grepSrc(pattern: string, includeGlob = '*.{ts,tsx}'): string {
  try {
    return execSync(
      `grep -rn "${pattern}" ${SRC_DIR} --include="${includeGlob}" 2>/dev/null || true`,
      { encoding: 'utf-8', cwd: WEBSITE_DIR }
    ).trim();
  } catch {
    return '';
  }
}

function grepAll(pattern: string): string {
  try {
    return execSync(
      `grep -rn "${pattern}" ${SRC_DIR} ${BACKEND_DIR} ${SHARED_DIR} ` +
      `--include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null | ` +
      `grep -v node_modules | grep -v dist | grep -v ".next" | ` +
      `grep -v spec.ts | grep -v test | grep -v pricing-config || true`,
      { encoding: 'utf-8', cwd: WEBSITE_DIR }
    ).trim();
  } catch {
    return '';
  }
}

// ─── Test: No stale prices anywhere ──────────────────────────────────────

test.describe('Pricing Integrity: No Stale Prices', () => {
  for (const stale of STALE_PRICES) {
    test(`[stale] No occurrence of ${stale.description}`, () => {
      const matches = grepAll(stale.pattern);
      const lines = matches ? matches.split('\n').filter(Boolean) : [];

      // Filter out test files, mocks, and comments
      const real = lines.filter(l =>
        !l.includes('.spec.ts') &&
        !l.includes('test') &&
        !l.includes('mock_app') &&
        !l.includes('// Old') &&
        !l.includes('// Legacy') &&
        !l.includes('STALE_PRICES')
      );

      expect(
        real,
        `Found ${real.length} stale price references (${stale.description}):\n${real.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

// ─── Test: pricing-config.ts is the canonical source ─────────────────────

test.describe('Pricing Integrity: Config Is Source of Truth', () => {
  test('[config] pricing-config.ts exists and exports PRICING', () => {
    const configPath = join(SRC_DIR, 'lib', 'pricing-config.ts');
    expect(existsSync(configPath), 'pricing-config.ts missing').toBe(true);

    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('export const PRICING');
    expect(content).toContain('export function calculateTeamPrice');
  });

  test('[config] Pro monthly is $15', () => {
    const configPath = join(SRC_DIR, 'lib', 'pricing-config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toMatch(/monthly:\s*15/);
  });

  test('[config] Pro annual is $12 (20% discount)', () => {
    const configPath = join(SRC_DIR, 'lib', 'pricing-config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toMatch(/annual:\s*12/);
  });

  test('[config] Teams base is $60 (5 seats)', () => {
    const configPath = join(SRC_DIR, 'lib', 'pricing-config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toMatch(/baseMonthly:\s*60/);
  });

  test('[config] Free tokens is 50,000', () => {
    const configPath = join(SRC_DIR, 'lib', 'pricing-config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toMatch(/tokens:\s*50[_,]?000/);
  });

  test('[config] Savings percentage is 20', () => {
    const configPath = join(SRC_DIR, 'lib', 'pricing-config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toMatch(/savingsPercentage:\s*20/);
  });
});

// ─── Test: Key files reference correct values ────────────────────────────

test.describe('Pricing Integrity: Cross-Surface Consistency', () => {
  const SURFACES = [
    {
      file: 'src/app/pricing/client.tsx',
      checks: [
        { pattern: /50K tokens/, description: 'Free tier shows 50K' },
      ],
    },
    {
      file: 'src/components/tools/cost-calculator.tsx',
      checks: [
        { pattern: /cost:\s*15|PRICING\.pro\.monthly/, description: 'Pro cost is $15' },
        { pattern: /cost:\s*60|baseMonthly|PRICING\.teams/, description: 'Teams cost is $60' },
      ],
    },
    {
      file: 'src/lib/stripe.ts',
      checks: [
        { pattern: /price:\s*15|PRICING\.pro\.monthly/, description: 'Stripe Pro price is $15' },
        { pattern: /price:\s*60|PRICING\.teams\.baseMonthly/, description: 'Stripe Teams price is $60' },
      ],
    },
    {
      file: 'src/components/stripe-checkout.tsx',
      checks: [
        { pattern: /price:\s*15|PRICING\.pro\.monthly/, description: 'Checkout Pro price is $15' },
        { pattern: /price:\s*60|PRICING\.teams\.baseMonthly/, description: 'Checkout Teams price is $60' },
      ],
    },
    {
      file: 'src/components/support-chatbot.tsx',
      checks: [
        { pattern: /\$15|PRICING\.pro\.monthly/, description: 'Chatbot Pro price is $15' },
        { pattern: /\$60|PRICING\.teams\.baseMonthly/, description: 'Chatbot Teams price is $60' },
      ],
    },
    {
      file: 'src/app/compare/client.tsx',
      checks: [
        { pattern: /50K/, description: 'Compare page says 50K free tokens' },
      ],
    },
    {
      file: 'src/app/auth/signup/client.tsx',
      checks: [
        { pattern: /50,000|50K|50_000/, description: 'Signup page says 50K tokens' },
      ],
    },
  ];

  for (const surface of SURFACES) {
    const filePath = join(WEBSITE_DIR, surface.file);
    if (!existsSync(filePath)) continue;

    for (const check of surface.checks) {
      test(`[surface] ${surface.file}: ${check.description}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toMatch(check.pattern);
      });
    }
  }
});

// ─── Test: Backend pricing matches frontend ──────────────────────────────

test.describe('Pricing Integrity: Backend/Frontend Alignment', () => {
  test('[backend] fortress_types.py Pro price matches config ($15)', () => {
    const pyPath = join(SHARED_DIR, 'fortress_types.py');
    if (!existsSync(pyPath)) return;
    const content = readFileSync(pyPath, 'utf-8');
    // Should contain 15 for pro price
    expect(content).toMatch(/price.*15|15.*price|monthly.*15/i);
    // Should NOT contain old prices
    expect(content).not.toMatch(/price.*9\.99/i);
    expect(content).not.toMatch(/price.*29[^0-9]/i);
  });

  test('[backend] fortress_types.py Teams price matches config ($60)', () => {
    const pyPath = join(SHARED_DIR, 'fortress_types.py');
    if (!existsSync(pyPath)) return;
    const content = readFileSync(pyPath, 'utf-8');
    expect(content).toMatch(/price.*60|60.*price|monthly.*60/i);
    // Should NOT contain old $99
    expect(content).not.toMatch(/price.*99[^0-9]/i);
  });

  test('[backend] API pricing endpoint uses correct values', () => {
    const mainPath = join(BACKEND_DIR, 'main.py');
    if (!existsSync(mainPath)) return;
    const content = readFileSync(mainPath, 'utf-8');
    // Free tier should say 50K tokens
    expect(content).toMatch(/50K|50,?000.*tokens|50_000/i);
  });
});

// ─── Test: Live site pricing consistency ─────────────────────────────────

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Pricing Integrity: Live Site Verification', () => {
  test('[live] Pricing page shows $15 Pro', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toContain('$15');
  });

  test('[live] Pricing page shows $60 Teams base', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toContain('$60');
  });

  test('[live] Pricing page shows 50K free tokens', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/50K|50,000/);
  });

  test('[live] Compare page says 50K (not 10K)', async ({ page }) => {
    await page.goto(`${BASE}/compare`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).not.toMatch(/10K free token/i);
    expect(body).toMatch(/50K/);
  });

  test('[live] Cost calculator shows $15 Pro', async ({ page }) => {
    await page.goto(`${BASE}/tools`);
    await page.waitForTimeout(5000);
    // The calculator is a client component — interact with plan selector
    const select = page.locator('select').first();
    if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get all option texts — should include "Pro - $15"
      const options = await select.locator('option').allTextContents();
      const hasProPrice = options.some(o => o.includes('$15') || o.includes('15'));
      expect(hasProPrice, `No Pro tier with $15 in options: ${options.join(', ')}`).toBe(true);
    } else {
      // Fallback: check body text after hydration
      const body = await page.locator('body').textContent() || '';
      expect(body).toMatch(/Pro.*\$15|\$15.*Pro|15\/month/);
    }
  });

  test('[live] Chatbot mentions $15 Pro', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);
    // Open chatbot if available
    const chatBtn = page.locator('[aria-label*="chat"], [aria-label*="support"], button:has-text("Chat")').first();
    if (await chatBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(1000);
      // Type pricing question
      const input = page.locator('input[placeholder*="question"], input[placeholder*="message"]').first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill('What is the pricing?');
        await input.press('Enter');
        await page.waitForTimeout(2000);
        const chatBody = await page.locator('body').textContent() || '';
        expect(chatBody).toContain('$15');
      }
    }
  });
});
