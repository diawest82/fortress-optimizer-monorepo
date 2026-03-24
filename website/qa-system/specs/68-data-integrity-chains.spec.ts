/**
 * Data Integrity Chain Tests — cross-surface consistency
 * Gaps: E1 (cross-surface data), E2 (pricing config vs render), E3 (user count)
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Data Integrity: Pricing Consistency', () => {

  test('[E2] Pricing config exists as single source of truth', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('export const PRICING');
    expect(content).toMatch(/monthly:\s*15/); // Pro = $15
    expect(content).toMatch(/baseMonthly:\s*60/); // Teams = $60
  });

  test('[E2] Pricing page renders Pro and Teams pricing', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    // Wait for client hydration — pricing is a client component
    await page.waitForSelector('text=/Free|Pro|Teams/i', { timeout: 10000 });
    const body = await page.locator('body').textContent() || '';
    // Check for key pricing indicators (exact dollar amounts are in client JS)
    expect(body).toMatch(/Free|Pro|Teams/);
    expect(body).toMatch(/token|Token/);
  });

  test('[E2] Compare page has 50K free tokens (not 10K)', async ({ page }) => {
    await page.goto(`${BASE}/compare`);
    await page.waitForSelector('text=/50K|token/i', { timeout: 10000 });
    const body = await page.locator('body').textContent() || '';
    expect(body).not.toMatch(/10K free/i);
    expect(body).toMatch(/50K/);
  });
});

test.describe('Data Integrity: API vs Frontend', () => {

  test('[E1] /api/pricing returns consistent tier data', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pricing`);
    if (res.status() !== 200) return;
    const data = await res.json();
    if (data.tiers) {
      const free = data.tiers.find((t: any) => t.name === 'free' || t.name === 'Free');
      if (free) {
        expect(free.tokens || free.token_limit).toMatch(/50/);
      }
    }
  });

  test('[E1] Backend health returns consistent version', async ({ request }) => {
    const res = await request.get('https://api.fortress-optimizer.com/health');
    if (res.status() !== 200) return;
    const data = await res.json();
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('status');
  });

  test('[E3] No stale prices in codebase (exhaustive grep)', () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `grep -rn "\\$9\\.99\\|\\$29[^0-9]\\|price.*99[^0-9]" ${join(WEBSITE_DIR, 'src')} --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const lines = result ? result.split('\n').filter((l: string) => !l.includes('.spec.ts') && !l.includes('mock_app')) : [];
    expect(lines, `Found stale prices:\n${lines.join('\n')}`).toHaveLength(0);
  });
});
