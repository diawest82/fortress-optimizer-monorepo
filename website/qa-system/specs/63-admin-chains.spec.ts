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

  test('[D3] /api/admin/kpis requires auth (no anonymous access)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/kpis`);
    // Admin endpoints MUST require auth — 401/403 only.
    // Previously this asserted `< 500` which let the unprotected /api/admin/kpis
    // bug ship for months. See feedback_qa_admin_role_blindspot memory.
    expect(
      [401, 403],
      `/api/admin/kpis returned ${res.status()} unauthenticated — admin endpoints must reject anonymous requests.`
    ).toContain(res.status());
  });

  test('[D3] Admin KPIs return real metrics when authenticated as admin', async ({ request }) => {
    // Without admin auth this returns 401/403, so we can't validate content here.
    // The shape assertion runs only when run with FORTRESS_TEST_URL + a valid
    // admin session cookie. Skipping silently when unauthenticated is an
    // explicit limitation noted in the cleanup todos.
    const res = await request.get(`${BASE}/api/admin/kpis`);
    if (res.status() !== 200) {
      test.skip(true, `Admin KPIs require authenticated session (got ${res.status()})`);
      return;
    }
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

  test('[D3] Admin layout source requires admin role (not just any session)', () => {
    // Static signal — paired with runtime tests in 87-admin-surface-audit.spec.ts
    // (which actually hit /api/admin/* and assert 401/403 unauthenticated).
    const file = join(WEBSITE_DIR, 'src/app/admin/layout.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // The layout must do more than check for "any logged-in user" — it must
    // verify the user has role === 'admin'. The previous check accepted
    // adminToken/isAuthenticated which were removed when the layout was
    // refactored to use the regular session + role; that left the static
    // check passing on a stale signal.
    expect(content).toMatch(/role\s*===?\s*['"]admin['"]/);
    expect(content).toMatch(/useAuthContext|getServerSession|requireAdmin/);
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

  test('[D2] Support ticket API requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/support/tickets`);
    // /api/support/tickets is per-user data — must require auth.
    expect(
      [401, 403],
      `/api/support/tickets returned ${res.status()} unauthenticated — must require auth.`
    ).toContain(res.status());
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
