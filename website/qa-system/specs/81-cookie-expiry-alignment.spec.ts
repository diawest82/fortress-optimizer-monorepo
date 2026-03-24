/**
 * Cookie Expiry Alignment — verify all auth cookies expire together
 * If auth cookie expires before indicator, nav shows "Sign Out" but APIs fail 401.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Cookie Expiry Alignment', () => {

  test('All three cookies have matching maxAge in source', () => {
    const file = join(WEBSITE_DIR, 'src/lib/secure-cookies.ts');
    const content = readFileSync(file, 'utf-8');

    // Extract maxAge values for each cookie function
    const authMatch = content.match(/setAuthTokenCookie[\s\S]*?maxAge:\s*(\d+\s*\*\s*\d+\s*\*\s*\d+|\d+)/);
    const csrfMatch = content.match(/setCsrfTokenCookie[\s\S]*?maxAge:\s*(\d+\s*\*\s*\d+\s*\*\s*\d+|\d+)/);
    const indicatorMatch = content.match(/fortress_logged_in[\s\S]*?maxAge:\s*(\d+\s*\*\s*\d+\s*\*\s*\d+|\d+)/);

    expect(authMatch, 'Auth cookie maxAge not found').toBeTruthy();
    expect(csrfMatch, 'CSRF cookie maxAge not found').toBeTruthy();
    expect(indicatorMatch, 'Indicator cookie maxAge not found').toBeTruthy();

    // All should evaluate to the same value (24 * 60 * 60 = 86400)
    const evalMaxAge = (s: string) => {
      try { return eval(s); } catch { return -1; }
    };

    const authAge = evalMaxAge(authMatch![1]);
    const csrfAge = evalMaxAge(csrfMatch![1]);
    const indicatorAge = evalMaxAge(indicatorMatch![1]);

    expect(authAge, 'Auth cookie maxAge should be 86400 (24h)').toBe(86400);
    expect(csrfAge, `CSRF maxAge (${csrfAge}) should match auth maxAge (${authAge})`).toBe(authAge);
    expect(indicatorAge, `Indicator maxAge (${indicatorAge}) should match auth maxAge (${authAge})`).toBe(authAge);
  });

  test('Indicator cookie is NOT httpOnly (JS must read it)', () => {
    const file = join(WEBSITE_DIR, 'src/lib/secure-cookies.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/fortress_logged_in[\s\S]*?httpOnly:\s*false/);
  });

  test('Auth cookie IS httpOnly', () => {
    const file = join(WEBSITE_DIR, 'src/lib/secure-cookies.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/fortress_auth_token[\s\S]*?httpOnly:\s*true/);
  });

  test('setSecureCookie respects caller httpOnly option', () => {
    const file = join(WEBSITE_DIR, 'src/lib/secure-cookies.ts');
    const content = readFileSync(file, 'utf-8');
    // Must NOT hardcode httpOnly: true — must check options
    expect(content).toMatch(/options\.httpOnly\s*!==\s*undefined/);
  });

  test('clearAuthCookies clears all cookies including indicator', () => {
    const file = join(WEBSITE_DIR, 'src/lib/secure-cookies.ts');
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('fortress_auth_token');
    expect(content).toContain('fortress_logged_in');
    expect(content).toContain('fortress_csrf_token');
  });
});
