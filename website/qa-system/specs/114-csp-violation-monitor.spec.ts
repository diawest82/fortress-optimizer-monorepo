/**
 * CSP Violation Monitor — navigate auth flows while checking for CSP errors
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const PAGES = [
  '/', '/pricing', '/install', '/compare', '/support', '/tools',
  '/docs', '/auth/login', '/auth/signup', '/auth/signup/team',
  '/dashboard', '/account', '/forgot-password',
  // /admin/login deleted on 2026-04-08 — admins use /auth/login now
];

test.describe('CSP Violation Monitor', () => {

  for (const path of PAGES) {
    test(`${path} has no critical CSP violations`, async ({ page }) => {
      const cspErrors: string[] = [];

      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Content Security Policy') && !text.includes('posthog') && !text.includes('googletagmanager')) {
          cspErrors.push(text.slice(0, 200));
        }
      });

      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(3000);

      expect(
        cspErrors,
        `${path} has CSP violations:\n${cspErrors.join('\n')}`
      ).toHaveLength(0);
    });
  }
});
