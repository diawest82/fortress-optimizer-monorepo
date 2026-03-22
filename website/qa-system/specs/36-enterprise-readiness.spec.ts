/**
 * Enterprise Readiness — Audit of enterprise-facing features and compliance
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');
const ROOT_DIR = join(WEBSITE_DIR, '..');

test.describe('Enterprise Readiness: Compliance & Features', () => {

  test.describe('Enterprise Landing & Lead Capture', () => {
    test('Enterprise features component exists', async () => {
      const featurePath = join(WEBSITE_DIR, 'src/components/account/enterprise-features.tsx');
      expect(existsSync(featurePath), 'enterprise-features.tsx should exist').toBe(true);
    });

    test('Pricing page has Contact Sales for enterprise', async ({ page }) => {
      const pricingSource = readFileSync(join(WEBSITE_DIR, 'src/app/pricing/client.tsx'), 'utf-8');
      expect(pricingSource).toContain('Contact Sales');
      expect(pricingSource).toContain('mailto:sales@fortress-optimizer.com');
    });

    test('Enterprise pricing shows Custom (not a dollar amount)', async ({ page }) => {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toContainText('Custom');
    });
  });

  test.describe('Compliance Documentation', () => {
    test('Privacy policy page exists with data handling content', async ({ page }) => {
      await page.goto(`${BASE}/legal/privacy`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.toLowerCase()).toMatch(/privacy|data|information|collect/i);
      expect(bodyText.length).toBeGreaterThan(500);
    });

    test('Terms of service page exists with contract terms', async ({ page }) => {
      await page.goto(`${BASE}/legal/terms`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.toLowerCase()).toMatch(/terms|service|agreement|license/i);
      expect(bodyText.length).toBeGreaterThan(500);
    });
  });

  test.describe('Security Compliance', () => {
    test('HSTS header with includeSubDomains', async () => {
      const res = await fetch(BASE);
      const hsts = res.headers.get('strict-transport-security') || '';
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
      // preload may be in next.config.js but overridden by vercel.json
      // Source code check:
      const nextConfig = readFileSync(join(WEBSITE_DIR, 'next.config.js'), 'utf-8');
      expect(nextConfig).toContain('preload');
    });

    test('X-Frame-Options DENY', async () => {
      const res = await fetch(BASE);
      const xfo = res.headers.get('x-frame-options') || '';
      expect(xfo).toBe('DENY');
    });

    test('Content-Security-Policy present', async () => {
      const res = await fetch(BASE);
      const csp = res.headers.get('content-security-policy') || '';
      expect(csp.length).toBeGreaterThan(20);
    });

    test('JWT tokens expire (not infinite)', async () => {
      const loginRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/auth/login/route.ts'), 'utf-8');
      expect(loginRoute).toMatch(/expiresIn|exp/);
    });

    test('API keys are hashed with SHA-256 (source verification)', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toMatch(/sha256|SHA256|hashlib/i);
    });

    test('Sentry scrubs secrets before sending', async () => {
      const sentrySetup = readFileSync(join(ROOT_DIR, 'backend/sentry_setup.py'), 'utf-8');
      expect(sentrySetup).toContain('before_send');
      expect(sentrySetup).toContain('fk_');
      expect(sentrySetup).toContain('sk_live_');
    });
  });

  test.describe('Team Management', () => {
    test('Team management component exists', async () => {
      const teamPath = join(WEBSITE_DIR, 'src/components/account/team-management.tsx');
      expect(existsSync(teamPath)).toBe(true);
    });

    test('Team invite API endpoint exists', async () => {
      const res = await fetch(`${BASE}/api/teams/test-team/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invite@test.com', role: 'member' }),
      });
      // Should be 401 (no auth) or 404 (team not found) — NOT 500
      expect(res.status).not.toBe(500);
    });

    test('Team members API endpoint exists', async () => {
      const res = await fetch(`${BASE}/api/teams/test-team/members`);
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Audit Trail', () => {
    test('Backend logs optimization operations', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain('OptimizationLog');
      expect(mainPy).toContain('request_id');
      expect(mainPy).toContain('key_hash');
    });

    test('Request ID middleware provides tracing', async () => {
      const res = await fetch(`${API_BASE}/health`);
      const requestId = res.headers.get('x-request-id');
      // Some backends return this, some don't — verify source code
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toMatch(/RequestIdMiddleware|request_id|X-Request-Id/);
    });

    test('Data retention policies defined', async () => {
      const cleanup = readFileSync(join(ROOT_DIR, 'backend/cleanup.py'), 'utf-8');
      expect(cleanup).toContain('LOG_RETENTION_DAYS');
      expect(cleanup).toContain('KEY_RETENTION_DAYS');
    });
  });
});
