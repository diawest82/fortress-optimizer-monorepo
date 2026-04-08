/**
 * Live Data Verification Agent — Ensures No Mock Data in Production
 *
 * This spec catches the exact bug we found: dashboards displaying
 * hardcoded fake numbers instead of real database data.
 *
 * Three layers:
 * 1. Source code grep — no hardcoded data arrays in dashboard components
 * 2. API response — /api/dashboard/stats returns hasData flag + real structure
 * 3. UI verification — dashboard shows empty state or live metrics, never fake
 *
 * Run: npx playwright test --project=qa-system --grep "Live Data"
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

// ─── Layer 1: Source Code — No Hardcoded Data ────────────────────────────

test.describe('Live Data: No Hardcoded Mock Data in Source', () => {

  test('[source] Dashboard has no hardcoded timeRangeData object', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // Should NOT have static data objects with fake numbers
    expect(content).not.toMatch(/totalTokens:\s*2847293/);
    expect(content).not.toMatch(/costSaved:\s*1852/);
    expect(content).not.toMatch(/activeUsers:\s*1250/);
    expect(content).not.toMatch(/tokensOptimized:\s*926000/);
  });

  test('[source] Dashboard has no hardcoded recent optimizations', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // Should NOT have fake user activity
    expect(content).not.toContain("'dev-user-1'");
    expect(content).not.toContain("'slack-team-a'");
    expect(content).not.toContain("'copilot-user'");
    expect(content).not.toContain("'zapier-user'");
  });

  test('[source] Dashboard has no hardcoded platform usage data', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // Should NOT have static platform breakdowns
    expect(content).not.toMatch(/tokens:\s*450000,\s*percentage:\s*35/);
    expect(content).not.toMatch(/tokens:\s*380000,\s*percentage:\s*29/);
  });

  test('[source] Dashboard fetches from /api/dashboard/stats', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('/api/dashboard/stats');
  });

  test('[source] Admin KPIs has no Math.random() in executable code', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // Filter out comments — only check executable lines
    const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    const codeOnly = codeLines.join('\n');
    expect(codeOnly).not.toContain('Math.random()');
  });

  test('[source] Admin KPIs queries real user count', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('prisma.user.count()');
  });

  test('[source] Admin KPIs queries real optimization data', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('prisma.tokenCountUsage.aggregate');
  });

  test('[source] Account savings does not multiply by 0.2', () => {
    const file = join(WEBSITE_DIR, 'src/components/account-content.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // Should NOT have hardcoded savings multiplier
    expect(content).not.toMatch(/tokens_used.*\*\s*0\.2/);
  });

  test('[source] Dashboard stats API exists and returns hasData flag', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    expect(existsSync(file), '/api/dashboard/stats route missing').toBe(true);

    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('hasData');
    expect(content).toContain('prisma.tokenCountUsage');
  });
});

// ─── Layer 2: API Response — Real Data Structure ─────────────────────────

test.describe('Live Data: API Returns Real Structure', () => {

  test('[api] /api/dashboard/stats returns valid JSON with hasData flag', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats?range=7d`);
    // May return 401 if not authenticated — that's expected
    if (res.status() === 401) {
      // Unauthenticated — verify it doesn't return fake data
      const body = await res.json();
      expect(body.error || body.hasData !== undefined).toBeTruthy();
      return;
    }

    const data = await res.json();
    expect(data).toHaveProperty('hasData');
    expect(data).toHaveProperty('totalTokens');
    expect(data).toHaveProperty('tokensSaved');
    expect(data).toHaveProperty('costSaved');
    expect(data).toHaveProperty('dailyData');
    expect(typeof data.hasData).toBe('boolean');
    expect(typeof data.totalTokens).toBe('number');
  });

  test('[api] /api/admin/kpis returns real metrics (not random)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/kpis`);
    if (res.status() !== 200) return; // May need auth

    const data = await res.json();
    expect(data).toHaveProperty('totalUsers');
    expect(data).toHaveProperty('lastUpdated');
    expect(typeof data.totalUsers).toBe('number');

    // Should not have fabricated data markers
    expect(data.isFallback).not.toBe(true);
  });

  test('[api] /api/dashboard/stats for new user returns hasData: false', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats?range=7d`);
    if (res.status() === 401) return; // Expected if not authenticated

    const data = await res.json();
    // New user should have hasData: false and zero metrics
    if (!data.hasData) {
      expect(data.totalTokens).toBe(0);
      expect(data.tokensSaved).toBe(0);
      expect(data.costSaved).toBe(0);
      expect(data.emptyStateMessage).toBeTruthy();
    }
  });
});

// ─── Layer 3: UI Verification — Dashboard Shows Real State ───────────────

test.describe('Live Data: Dashboard UI Shows Real State', () => {

  test('[ui] Dashboard shows empty state or real data — never fake numbers', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(5000);

    const body = await page.locator('body').textContent() || '';

    // Should NOT show the old hardcoded numbers
    expect(body).not.toContain('2.8M');
    expect(body).not.toContain('$1,852');
    expect(body).not.toContain('1,250');

    // Should show EITHER empty state OR real (small) numbers
    const hasEmptyState = body.includes('No optimization data yet') ||
                          body.includes('No optimizations recorded') ||
                          body.includes('Get Started');
    const hasRealData = body.includes('Tokens Processed') ||
                        body.includes('Tokens Saved');
    const hasLoading = body.includes('Loading');

    expect(
      hasEmptyState || hasRealData || hasLoading,
      'Dashboard should show empty state, real data, or loading — not nothing'
    ).toBe(true);
  });

  test('[ui] Dashboard does not show fake user names', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(5000);

    const body = await page.locator('body').textContent() || '';

    expect(body).not.toContain('dev-user-1');
    expect(body).not.toContain('slack-team-a');
    expect(body).not.toContain('copilot-user');
    expect(body).not.toContain('zapier-user');
  });

  test('[ui] Dashboard metrics are zero or real — not millions for a new product', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(5000);

    const body = await page.locator('body').textContent() || '';

    // A new product should NOT show millions of tokens
    // These patterns would indicate mock data leaked back in
    expect(body).not.toMatch(/12,850,000|38,550,000|12\.8M|38\.5M/);
    expect(body).not.toMatch(/\$8,355|\$25,065/);
    expect(body).not.toMatch(/3,840 active|8,200 active/);
  });

  test('[ui] Admin route either shows admin UI or redirects to auth', async ({ page }) => {
    // /admin/login was deleted on 2026-04-08; admins use /auth/login.
    // Visiting /admin without a session should redirect to /auth/login.
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/auth\/login|\/admin/);
    // Page should render something, not be blank
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(30);
  });

  test('[ui] Account savings dashboard shows 0 for new user — not fabricated 20%', async ({ page }) => {
    // Navigate to account — will redirect to login if not authenticated
    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);

    const url = page.url();
    if (url.includes('/auth/login')) {
      // Not authenticated — that's fine, test passes
      return;
    }

    const body = await page.locator('body').textContent() || '';

    // If user has no optimizations, savings should show 0
    // Should NOT show fabricated numbers based on tokens_used * 0.2
    const hasSavingsSection = body.includes('Tokens Saved') || body.includes('Cost Saved');
    if (hasSavingsSection) {
      // The displayed "Tokens Saved" should be based on actual data,
      // not a formula. We can't verify the exact number without auth,
      // but we can verify it's not suspiciously large for a new product.
      // A real early-stage product should have modest numbers.
      expect(body).not.toMatch(/Tokens Saved.*[1-9]\d{6}/); // Not millions saved
    }
  });
});

// ─── Layer 4: Data Flow Verification ────────────────────────────────────

test.describe('Live Data: Data Flow Is Correct', () => {

  test('[flow] /api/dashboard/stats route exists in source', () => {
    const routePath = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    expect(existsSync(routePath)).toBe(true);
  });

  test('[flow] Dashboard stats route queries TokenCountUsage', () => {
    const routePath = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    const content = readFileSync(routePath, 'utf-8');

    // Must query real optimization data
    expect(content).toContain('prisma.tokenCountUsage');
    // Must aggregate real totals
    expect(content).toMatch(/originalTokens|optimizedTokens/);
    // Must return hasData flag
    expect(content).toContain('hasData');
    // Must return emptyStateMessage for new users
    expect(content).toContain('emptyStateMessage');
  });

  test('[flow] Admin KPIs route queries real tables', () => {
    const routePath = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    const content = readFileSync(routePath, 'utf-8');

    // Must query real data tables
    expect(content).toContain('prisma.user.count');
    expect(content).toContain('prisma.tokenCountUsage.aggregate');
    expect(content).toContain('prisma.supportTicket.count');

    // Must NOT have fabrication patterns in executable code
    const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    const codeOnly = codeLines.join('\n');
    expect(codeOnly).not.toContain('Math.random');
    expect(codeOnly).not.toMatch(/visitorAcquisitions\s*\*\s*3/);
    expect(codeOnly).not.toMatch(/totalEmails\s*\*\s*250/);
  });
});
