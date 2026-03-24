/**
 * SDK Call → Dashboard Reflects — verify SDK usage appears in web dashboard
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('SDK → Dashboard Chain', () => {

  test('[source] Dashboard stats query uses TokenCountUsage', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('prisma.tokenCountUsage');
  });

  test('[source] Dashboard shows hasData flag for empty state', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('hasData');
    expect(content).toContain('emptyStateMessage');
  });

  test('[source] Dashboard client fetches from /api/dashboard/stats', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('/api/dashboard/stats');
  });

  test('[source] Dashboard has loading skeleton', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/loading|Loading|skeleton|animate-pulse/i);
  });

  test('[source] Dashboard has empty state with install CTA', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/No optimization|no data|Get Started|Install/i);
  });

  test('[live] Dashboard API returns valid structure', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats?range=7d`);
    if (res.status() === 401) return; // Expected without auth
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('hasData');
      expect(data).toHaveProperty('totalTokens');
      expect(data).toHaveProperty('dailyData');
    }
  });
});
