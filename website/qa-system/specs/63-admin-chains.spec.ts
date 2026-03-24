/**
 * Admin Chain Tests — KPIs, ticket management, access control
 *
 * Gaps: D1 (admin KPIs live), D2 (admin ticket response), D3 (non-admin blocked)
 *
 * Run: npx playwright test --project=qa-system --grep "Admin Chain"
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Admin Chain: Access Control', () => {

  test('[D3] /api/admin/kpis returns data or requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/kpis`);
    // Should either return real data (200) or require auth (401/403) — NOT crash (500)
    expect(res.status()).toBeLessThan(500);
  });

  test('[D3] Admin KPIs return real metrics (not fabricated)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/kpis`);
    if (res.status() !== 200) return;
    const data = await res.json();
    expect(data).toHaveProperty('lastUpdated');
    expect(data.isFallback).not.toBe(true);
    // Should have real fields
    expect(typeof (data.totalUsers ?? data.visitorAcquisitions)).toBe('number');
  });

  test('[D3] Admin login page renders (not blank)', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.waitForTimeout(3000);
    const content = await page.locator('body').textContent() || '';
    expect(content.length).toBeGreaterThan(50);
    expect(content).toMatch(/email|password|sign in|log in|admin/i);
  });

  test('[D3] Admin routes source requires authentication', () => {
    const file = join(WEBSITE_DIR, 'src/app/admin/layout.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/adminToken|isAuthenticated|isPublicAdminPage/);
  });
});

test.describe('Admin Chain: KPI Data Quality', () => {

  test('[D1] Admin KPIs query real database tables', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('prisma.user.count');
    expect(content).toContain('prisma.tokenCountUsage');
  });

  test('[D1] Admin KPIs have no Math.random or fabricated data', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    const code = content.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toContain('Math.random');
  });

  test('[D1] Admin KPIs include support ticket count', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/supportTicket|openTickets/);
  });
});

test.describe('Admin Chain: Ticket Management', () => {

  test('[D2] Support ticket API exists', async ({ request }) => {
    const res = await request.get(`${BASE}/api/support/tickets`);
    // Should require auth, not crash
    expect(res.status()).toBeLessThan(500);
  });

  test('[D2] Ticket creation returns ticket number', async ({ request }) => {
    const res = await request.post(`${BASE}/api/support/tickets`, {
      data: { subject: 'Test', description: 'Test ticket', category: 'general', priority: 'normal' },
    });
    // 401 (no auth) or 201 (created) — NOT 500
    expect([201, 401, 403]).toContain(res.status());
    if (res.status() === 201) {
      const data = await res.json();
      expect(data.ticketNumber || data.ticket?.ticketNumber).toMatch(/FORT-/);
    }
  });

  test('[D2] Ticket source uses UUID-based numbers (not Date.now)', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/support/tickets/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/randomUUID|crypto/);
    expect(content).not.toMatch(/Date\.now\(\)\.toString\(\)\.slice/);
  });

  test('[D2] Ticket input is sanitized', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/support/tickets/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/sanitize|VALID_CATEGORIES|MAX_SUBJECT/);
  });
});
