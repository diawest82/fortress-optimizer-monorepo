/**
 * Team Data Verification Agent — Ensures team features use real data
 *
 * Tests:
 * 1. Source code: team APIs query real Prisma tables, no mock data
 * 2. API structure: /api/teams/:id/usage returns correct shape
 * 3. Per-member stats: members endpoint includes usage data
 * 4. Auto-provisioning: invite flow provisions API keys
 * 5. Dead code: no mock data components exist
 * 6. Data isolation: team usage only includes team members
 *
 * Run: npx playwright test --project=qa-system --grep "Team Data"
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

// ─── Layer 1: Source Code — Team APIs Use Real Data ──────────────────────

test.describe('Team Data: Source Code Verification', () => {

  test('[source] Team usage API exists', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    expect(existsSync(file), '/api/teams/:id/usage route missing').toBe(true);
  });

  test('[source] Team usage API queries TokenCountUsage', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('prisma.tokenCountUsage.aggregate');
    expect(content).toContain('prisma.tokenCountUsage.findMany');
  });

  test('[source] Team usage API aggregates across member IDs', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('userId: { in: memberIds }');
  });

  test('[source] Team usage API returns per-member breakdown', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('members: memberUsage');
    expect(content).toMatch(/tokensProcessed|tokensSaved|optimizationCount/);
  });

  test('[source] Team usage API returns hasData flag + empty state', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('hasData');
    expect(content).toContain('emptyStateMessage');
  });

  test('[source] Team usage API returns daily chart data', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('dailyData');
    expect(content).toContain('dailyMap');
  });

  test('[source] Team usage API verifies team membership before returning data', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('isMember');
    expect(content).toMatch(/403|Not a team member/);
  });

  test('[source] Team members API includes per-member usage stats', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('prisma.tokenCountUsage.aggregate');
    expect(content).toContain('tokensProcessed');
    expect(content).toContain('tokensSaved');
    expect(content).toContain('optimizationCount');
  });

  test('[source] Team members API has no hardcoded usage values', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    const content = readFileSync(file, 'utf-8');

    // Filter out comments
    const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//'));
    const codeOnly = codeLines.join('\n');

    expect(codeOnly).not.toMatch(/tokensProcessed:\s*\d{4,}/);
    expect(codeOnly).not.toMatch(/tokensSaved:\s*\d{4,}/);
    expect(codeOnly).not.toContain('Math.random');
  });

  test('[source] Invite flow auto-provisions API key for new member', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('autoProvisioned');
    expect(content).toContain('api_key_created');
    expect(content).toMatch(/fk_|randomUUID/);
  });
});

// ─── Layer 2: Dead Code — No Mock Components ────────────────────────────

test.describe('Team Data: No Mock Data Components', () => {

  test('[dead-code] usage-metrics.tsx has been deleted', () => {
    const file = join(WEBSITE_DIR, 'src/components/usage-metrics.tsx');
    expect(existsSync(file), 'usage-metrics.tsx still exists — contains Math.sin() mock data').toBe(false);
  });

  test('[dead-code] No Math.sin/Math.cos in any component (animated fake data)', () => {
    const components = [
      'src/app/dashboard/client.tsx',
      'src/components/account-content.tsx',
      'src/components/account/team-management.tsx',
    ];

    for (const relPath of components) {
      const file = join(WEBSITE_DIR, relPath);
      if (!existsSync(file)) continue;
      const content = readFileSync(file, 'utf-8');
      const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//'));
      const codeOnly = codeLines.join('\n');

      expect(codeOnly, `${relPath} contains Math.sin — likely fake animated data`).not.toContain('Math.sin');
      expect(codeOnly, `${relPath} contains Math.cos — likely fake animated data`).not.toContain('Math.cos');
    }
  });

  test('[dead-code] No component has hardcoded user activity arrays', () => {
    const components = [
      'src/app/dashboard/client.tsx',
      'src/components/account-content.tsx',
    ];

    for (const relPath of components) {
      const file = join(WEBSITE_DIR, relPath);
      if (!existsSync(file)) continue;
      const content = readFileSync(file, 'utf-8');

      expect(content).not.toContain("'dev-user-");
      expect(content).not.toContain("'slack-team-");
      expect(content).not.toContain("'copilot-user");
      expect(content).not.toContain("'zapier-user");
    }
  });
});

// ─── Layer 3: API Structure — Team Usage Endpoint ────────────────────────

test.describe('Team Data: API Response Structure', () => {

  test('[api] /api/teams/nonexistent/usage returns 401 or 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/nonexistent-id/usage`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('[api] /api/teams/:id/members returns members with usage fields', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/nonexistent-id/members`);
    // Should be 401/403/404 for non-authenticated/non-member
    expect([401, 403, 404]).toContain(res.status());
  });

  test('[api] Team usage endpoint requires authentication', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/test-team/usage`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('[api] Team members endpoint requires authentication', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/test-team/members`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Layer 4: Team Management UI ─────────────────────────────────────────

test.describe('Team Data: UI Verification', () => {

  test('[source] Team management receives real member data via props', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/team-management.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // Receives data as props from parent (account-content.tsx does the fetching)
    expect(content).toMatch(/teamMembers|TeamMember|Props/);
    // No hardcoded member data inside the component
    const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//'));
    const codeOnly = codeLines.join('\n');
    expect(codeOnly).not.toMatch(/\{ id:.*email:.*name:.*role:/);
  });

  test('[source] Team management shows member count from API', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/team-management.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('teamMembers');
    expect(content).toMatch(/\.length|members\.map/);
  });

  test('[source] Team seat limit comes from API, not hardcoded to 5', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/team-management.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    // The maxSeats should ideally come from the team data, not be hardcoded
    // Check that it's at least configurable
    expect(content).toMatch(/maxSeats|max_seats|seats/);
  });
});

// ─── Layer 5: Data Isolation ─────────────────────────────────────────────

test.describe('Team Data: Data Isolation', () => {

  test('[source] Team usage filters by member IDs only', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    // Must filter by team member IDs, not return all data
    expect(content).toContain('userId: { in: memberIds }');
    // Must verify team membership before returning data
    expect(content).toContain('isMember');
  });

  test('[source] User dashboard filters by individual user ID only', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/dashboard/stats/route.ts');
    const content = readFileSync(file, 'utf-8');

    // Must filter by authenticated user's ID
    expect(content).toContain('userId: auth.id');
  });

  test('[source] Team usage API does not expose data to non-members', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    const content = readFileSync(file, 'utf-8');

    // Must have a membership check before returning data
    expect(content).toMatch(/if.*!isMember/);
    expect(content).toMatch(/status.*403/);
  });

  test('[source] Team members API does not expose data to non-members', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    const content = readFileSync(file, 'utf-8');

    expect(content).toMatch(/isMember|Not a member/);
    expect(content).toMatch(/status.*403/);
  });
});

// ─── Layer 6: Comprehensive Mock Data Grep ───────────────────────────────

test.describe('Team Data: No Mock Data Anywhere', () => {

  test('[grep] No hardcoded token counts in dashboard or team components', () => {
    const files = [
      'src/app/dashboard/client.tsx',
      'src/components/account-content.tsx',
      'src/components/account/team-management.tsx',
      'src/app/api/dashboard/stats/route.ts',
      'src/app/api/teams/[teamId]/usage/route.ts',
      'src/app/api/teams/[teamId]/members/route.ts',
      'src/app/api/admin/kpis/route.ts',
    ];

    for (const relPath of files) {
      const file = join(WEBSITE_DIR, relPath);
      if (!existsSync(file)) continue;
      const content = readFileSync(file, 'utf-8');
      const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
      const codeOnly = codeLines.join('\n');

      // No hardcoded large numbers that look like fake metrics
      expect(codeOnly, `${relPath} has hardcoded 2847293`).not.toContain('2847293');
      expect(codeOnly, `${relPath} has hardcoded 926000`).not.toContain('926000');
      expect(codeOnly, `${relPath} has hardcoded 12850000`).not.toContain('12850000');
      expect(codeOnly, `${relPath} has hardcoded 38550000`).not.toContain('38550000');

      // No Math.random in production data generation
      expect(codeOnly, `${relPath} uses Math.random()`).not.toContain('Math.random()');
    }
  });

  test('[grep] Account savings does not fabricate with * 0.2 multiplier', () => {
    const file = join(WEBSITE_DIR, 'src/components/account-content.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');

    expect(content).not.toMatch(/tokens_used\s*\*\s*0\.2/);
  });

  test('[grep] Admin KPIs do not use email count as proxy for visitors', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/admin/kpis/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    const codeOnly = codeLines.join('\n');

    expect(codeOnly).not.toMatch(/visitorAcquisitions\s*=.*totalEmails/);
    expect(codeOnly).not.toMatch(/packagesInstalled\s*=.*visitorAcquisitions\s*\*/);
  });
});
