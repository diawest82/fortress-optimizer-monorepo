/**
 * Pricing Single Source of Truth — Exhaustive verification
 * Ensures ALL pricing references come from pricing-config.ts
 * and no stale/hardcoded prices exist anywhere in src/
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');
const ROOT_DIR = join(WEBSITE_DIR, '..');

test.describe('Pricing Single Source of Truth', () => {

  test.describe('No Stale Prices (Exhaustive Grep)', () => {
    test('No $9.99 anywhere in website src/', async () => {
      const result = execSync(
        'grep -rn "9\\.99" src/ --include="*.ts" --include="*.tsx" || true',
        { cwd: WEBSITE_DIR, encoding: 'utf-8' }
      ).trim();
      expect(result, 'Found stale $9.99 reference').toBe('');
    });

    test('No $29 pricing anywhere in website src/', async () => {
      const result = execSync(
        'grep -rn "\\$29[^0-9]" src/ --include="*.ts" --include="*.tsx" || true',
        { cwd: WEBSITE_DIR, encoding: 'utf-8' }
      ).trim();
      // Filter out test specs and irrelevant matches
      const lines = result.split('\n').filter(l =>
        l && !l.includes('.spec.') && !l.includes('test') && l.includes('$29')
      );
      expect(lines, `Found stale $29 reference: ${lines.join(', ')}`).toHaveLength(0);
    });

    test('No $99 Teams pricing anywhere in website src/', async () => {
      const result = execSync(
        'grep -rn "price.*99\\b\\|\\$99/mo\\|99/month" src/ --include="*.ts" --include="*.tsx" || true',
        { cwd: WEBSITE_DIR, encoding: 'utf-8' }
      ).trim();
      const lines = result.split('\n').filter(l =>
        l && !l.includes('.spec.') && !l.includes('test')
      );
      expect(lines, `Found stale $99 reference: ${lines.join(', ')}`).toHaveLength(0);
    });

    test('No "Coming Soon" in page title metadata', async () => {
      const layout = readFileSync(join(WEBSITE_DIR, 'src/app/layout.tsx'), 'utf-8');
      expect(layout).not.toMatch(/title:.*Coming Soon/i);
    });

    test('No "February 2026" or stale dates in metadata', async () => {
      const layout = readFileSync(join(WEBSITE_DIR, 'src/app/layout.tsx'), 'utf-8');
      expect(layout).not.toContain('February 2026');
      expect(layout).not.toContain('beta launching');
    });

    test('No fabricated ratings in structured data', async () => {
      const layout = readFileSync(join(WEBSITE_DIR, 'src/app/layout.tsx'), 'utf-8');
      expect(layout).not.toContain('ratingCount');
      expect(layout).not.toContain('ratingValue');
    });
  });

  test.describe('pricing-config.ts Is Source of Truth', () => {
    test('pricing-config.ts exists with all tiers', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toContain('free:');
      expect(config).toContain('pro:');
      expect(config).toContain('teams:');
      expect(config).toContain('enterprise:');
    });

    test('pricing-config.ts has Pro at $15', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toMatch(/pro:[\s\S]*monthly:\s*15/);
    });

    test('pricing-config.ts has Teams base at $60', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toMatch(/teams:[\s\S]*baseMonthly:\s*60/);
    });

    test('pricing-config.ts has annual discount at 20%', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toContain('ANNUAL_DISCOUNT');
      expect(config).toContain('0.20');
    });

    test('pricing-config.ts has free tier at 50K tokens', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toMatch(/free:[\s\S]*tokens:\s*50[_,]?000/);
    });

    test('pricing-config.ts has platform counts', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toContain('PLATFORMS');
      expect(config).toContain('coreCount');
      expect(config).toContain('totalCount');
    });

    test('pricing-config.ts has support SLAs', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toContain('SUPPORT_SLAS');
      expect(config).toContain('responseTime');
    });

    test('pricing-config.ts has company info', async () => {
      const config = readFileSync(join(WEBSITE_DIR, 'src/lib/pricing-config.ts'), 'utf-8');
      expect(config).toContain('COMPANY');
      expect(config).toContain('supportEmail');
      expect(config).toContain('salesEmail');
      expect(config).toContain('fortress-optimizer.com');
    });
  });

  test.describe('Key Components Import From Config', () => {
    test('stripe.ts imports from pricing-config', async () => {
      const stripe = readFileSync(join(WEBSITE_DIR, 'src/lib/stripe.ts'), 'utf-8');
      expect(stripe).toContain('pricing-config');
    });

    test('cost-calculator imports from pricing-config', async () => {
      const calc = readFileSync(join(WEBSITE_DIR, 'src/components/tools/cost-calculator.tsx'), 'utf-8');
      expect(calc).toContain('pricing-config');
    });

    test('stripe-checkout imports from pricing-config', async () => {
      const checkout = readFileSync(join(WEBSITE_DIR, 'src/components/stripe-checkout.tsx'), 'utf-8');
      expect(checkout).toContain('pricing-config');
    });
  });

  test.describe('Backend Pricing Matches Frontend', () => {
    test('fortress_types.py Pro price matches pricing-config', async () => {
      const types = readFileSync(join(ROOT_DIR, 'shared-libs/fortress_types.py'), 'utf-8');
      expect(types).toContain('"price_monthly": 15');
    });

    test('fortress_types.py Teams price matches pricing-config', async () => {
      const types = readFileSync(join(ROOT_DIR, 'shared-libs/fortress_types.py'), 'utf-8');
      expect(types).toContain('"price_monthly": 60');
    });
  });
});
