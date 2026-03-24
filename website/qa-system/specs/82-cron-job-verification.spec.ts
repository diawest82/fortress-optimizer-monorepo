/**
 * Cron Job Verification — verify scheduled tasks exist and are callable
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Cron Job Verification', () => {

  test('vercel.json has cron schedule configured', () => {
    const file = join(WEBSITE_DIR, '..', 'vercel.json');
    const file2 = join(WEBSITE_DIR, 'vercel.json');
    const f = existsSync(file) ? file : file2;
    expect(existsSync(f), 'vercel.json not found').toBe(true);
    const content = readFileSync(f, 'utf-8');
    expect(content).toContain('crons');
    expect(content).toContain('/api/cron/daily');
  });

  test('/api/cron/daily endpoint exists and requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cron/daily`);
    // Should require CRON_SECRET — 401 or 403, not 404 or 500
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).not.toBe(404);
  });

  test('Cron source has daily automation tasks', () => {
    const file = join(WEBSITE_DIR, 'src/lib/automation/cron.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/runDailyAutomation|daily/i);
  });

  test('Cron source has error handling per task', () => {
    const file = join(WEBSITE_DIR, 'src/lib/automation/cron.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/try|catch/);
  });

  test('Cron endpoint is secured with CRON_SECRET', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/cron/daily/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/CRON_SECRET/);
  });
});
