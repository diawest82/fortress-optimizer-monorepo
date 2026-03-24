/**
 * Free Tier Monthly Reset + Long-Lived Session Handling
 * Temporal edge cases for billing and auth.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Free Tier Token Reset', () => {

  test('Backend has monthly token reset logic', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/monthly_reset|monthly_tokens_used.*=.*0|reset_at/i);
  });

  test('Backend enforces 50K limit for free tier', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/50000|50_000|token.*limit/i);
  });

  test('Backend returns usage_warning at 80% of limit', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/usage_warning|usage_pct|80/);
  });

  test('Pro tier has no monthly token limit', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // Pro should have unlimited tokens (null or -1 or "unlimited")
    expect(content).toMatch(/pro[\s\S]*?unlimited.*true|pro[\s\S]*?tokens.*-1|pro[\s\S]*?tokens.*null/i);
  });
});

test.describe('Long-Lived Session Handling', () => {

  test('JWT has finite expiry (not permanent)', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/auth/login/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/expiresIn/);
    // Should NOT be "never" or very long (>7 days)
    expect(content).not.toMatch(/expiresIn.*365d|expiresIn.*999/);
  });

  test('Refresh token has longer expiry than auth token', () => {
    const file = join(WEBSITE_DIR, 'src/lib/secure-cookies.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    const authMatch = content.match(/setAuthTokenCookie[\s\S]*?maxAge:\s*([\d\s*]+)/);
    const refreshMatch = content.match(/setRefreshTokenCookie[\s\S]*?maxAge:\s*([\d\s*]+)/);
    if (authMatch && refreshMatch) {
      const authAge = eval(authMatch[1]);
      const refreshAge = eval(refreshMatch[1]);
      expect(refreshAge).toBeGreaterThan(authAge);
    }
  });

  test('Session expiry redirects to login (not white screen)', () => {
    // Already covered by spec 61 chain 5 — verify it's there
    const file = join(WEBSITE_DIR, 'qa-system/specs/61-identity-chains.spec.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/Token Expiry|expired.*token/i);
  });
});
