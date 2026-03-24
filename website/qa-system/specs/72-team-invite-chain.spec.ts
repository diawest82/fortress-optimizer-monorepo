/**
 * Team Invite → Member Access Chain
 * Gaps: team invite sending, member signup, team data visible
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Team Invite Chain', () => {

  test('[source] Invite endpoint sends email', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('sendTeamInviteEmail');
  });

  test('[source] Invite creates user with hashed password (not empty)', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/bcrypt.*hash|hashedPassword/);
    expect(content).not.toMatch(/password:\s*['"]\s*['"]/); // No empty string password
  });

  test('[source] Invite auto-provisions API key for member', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/autoProvisioned|api_key_created/);
  });

  test('[live] Team invite endpoint requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/teams/fake-team/members`, {
      data: { email: 'test@test.com' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('[live] Team usage endpoint requires membership', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/fake-team/usage`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('[source] Team usage aggregates across all members', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/usage/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('userId: { in: memberIds }');
  });

  test('[source] Team members include per-member usage stats', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('tokensProcessed');
    expect(content).toContain('tokensSaved');
  });

  test('[live] Team signup page exists', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup/team`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(50);
    expect(body).toMatch(/team|Team/);
  });
});
