/**
 * Backend Pricing Sync — verify frontend and backend prices match
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Backend Pricing Sync', () => {

  test('Frontend pricing-config.ts Pro = $15', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/monthly:\s*15/);
  });

  test('Backend fortress_types.py Pro = $15', () => {
    const file = join(WEBSITE_DIR, '..', 'shared-libs', 'fortress_types.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/price.*15|15.*price|monthly.*15/i);
  });

  test('Frontend Teams base = $60', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/baseMonthly:\s*60/);
  });

  test('Backend Teams = $60', () => {
    const file = join(WEBSITE_DIR, '..', 'shared-libs', 'fortress_types.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/price.*60|60.*price|monthly.*60/i);
  });

  test('Frontend free tokens = 50K', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/tokens:\s*50[_,]?000/);
  });

  test('Backend free tokens = 50K', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/50000|50_000/);
  });

  test('No stale $9.99 or $99 in either frontend or backend', () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `grep -rn "9\\.99\\|price.*99[^0-9]" ${join(WEBSITE_DIR, 'src')} ${join(WEBSITE_DIR, '..', 'shared-libs')} ${join(WEBSITE_DIR, '..', 'backend')} --include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const lines = result ? result.split('\n').filter((l: string) =>
      !l.includes('.spec.ts') && !l.includes('mock_app') && !l.includes('test') && !l.includes('//')
    ) : [];
    expect(lines, `Stale prices found:\n${lines.join('\n')}`).toHaveLength(0);
  });
});
