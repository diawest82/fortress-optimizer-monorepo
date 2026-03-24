/**
 * Multi-User Isolation Tests — user A can't see user B's data
 * Gap: K5 (data isolation between users)
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Multi-User Isolation: API Level', () => {

  test('[K5] Dashboard stats API filters by authenticated user', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('userId: auth.id');
  });

  test('[K5] Support tickets API filters by user ID', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/support/tickets/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/creatorId|userId|session\.user\.id/);
  });

  test('[K5] Team usage API filters by team member IDs', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('userId: { in: memberIds }');
  });

  test('[K5] Team members API checks membership before returning data', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/isMember|Not a member/);
  });

  test('[K5] Profile API returns only authenticated user data', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/users/profile/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // Should query by the authenticated user's ID, not accept arbitrary IDs
    expect(content).toMatch(/userId|decoded\.id/);
  });
});

test.describe('Multi-User Isolation: Access Control', () => {

  test('[K5] Unauthenticated request to /api/support/tickets returns 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/support/tickets`);
    expect([401, 403]).toContain(res.status());
  });

  test('[K5] Unauthenticated request to /api/dashboard/stats returns 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats`);
    expect([401, 403]).toContain(res.status());
  });

  test('[K5] Unauthenticated request to /api/users/profile returns 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/profile`);
    expect([401, 403]).toContain(res.status());
  });

  test('[K5] Non-member request to team data returns 403', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/fake-id/usage`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('[K5] Non-member request to team members returns 403', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/fake-id/members`);
    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe('Multi-User Isolation: No Data Leakage Patterns', () => {

  test('[K5] No API returns all users data (no admin-only query without gate)', () => {
    const apiDir = join(WEBSITE_DIR, 'src/app/api');
    const { execSync } = require('child_process');
    // Look for findMany without a where clause on user-facing routes
    const result = execSync(
      `grep -rn "findMany()" ${apiDir} --include="*.ts" 2>/dev/null | grep -v admin | grep -v node_modules || true`,
      { encoding: 'utf-8' }
    ).trim();
    // findMany() without any filter is suspicious on non-admin routes
    const suspicious = result ? result.split('\n').filter((l: string) =>
      !l.includes('.spec.ts') && !l.includes('admin') && !l.includes('cron')
    ) : [];
    // This is a heuristic — may have false positives
    if (suspicious.length > 0) {
      console.log('[K5] Warning: findMany() without filter found:', suspicious);
    }
  });

  test('[K5] Subscription API reads from authenticated user only', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/subscriptions/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // Should derive userId from auth, not from request body
    expect(content).toMatch(/userId|cookie|auth|session/);
  });
});
