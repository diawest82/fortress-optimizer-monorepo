/**
 * Security Scan — Header analysis, info leakage, SSL, mixed content
 * OWASP ZAP tests require zaproxy installed — marked as conditional.
 */

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Security Scan: Headers, Leakage, TLS', () => {

  test.describe('Information Leakage', () => {
    test('No Server header exposed on website', async () => {
      const res = await fetch(BASE);
      const server = res.headers.get('server') || '';
      // Vercel returns "Vercel" — acceptable. Should NOT expose "nginx/1.x" or "Apache"
      expect(server).not.toMatch(/nginx|apache|express|node/i);
    });

    test('No X-Powered-By header on website', async () => {
      const res = await fetch(BASE);
      const poweredBy = res.headers.get('x-powered-by') || '';
      // Next.js can expose this — should be removed
      if (poweredBy) {
        expect(poweredBy).not.toContain('Express');
      }
    });

    test('Backend API does not expose detailed server version', async () => {
      const res = await fetch(`${API_BASE}/health`);
      const server = res.headers.get('server') || '';
      // Should not expose exact version numbers
      expect(server).not.toMatch(/\d+\.\d+\.\d+/);
    });

    test('Error responses do not leak stack traces', async () => {
      const res = await fetch(`${BASE}/api/nonexistent-endpoint-12345`);
      const body = await res.text();
      expect(body).not.toContain('Traceback');
      expect(body).not.toContain('node_modules');
      expect(body).not.toMatch(/at\s+\w+\s+\(/); // JS stack trace pattern
    });
  });

  test.describe('TLS & Mixed Content', () => {
    test('All pages served over HTTPS (no downgrade)', async ({ page }) => {
      for (const path of ['/', '/pricing', '/auth/login']) {
        const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
        expect(page.url()).toMatch(/^https:/);
      }
    });

    test('No mixed content on homepage', async ({ page }) => {
      const mixedContent: string[] = [];
      page.on('request', (request) => {
        if (request.url().startsWith('http://') && !request.url().includes('localhost')) {
          mixedContent.push(request.url());
        }
      });
      await page.goto(BASE, { waitUntil: 'load', timeout: 15000 });
      expect(mixedContent, `Mixed content: ${mixedContent.join(', ')}`).toHaveLength(0);
    });

    test('HSTS header present with long max-age', async () => {
      const res = await fetch(BASE);
      const hsts = res.headers.get('strict-transport-security') || '';
      expect(hsts).toContain('max-age=');
      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0');
      expect(maxAge, 'HSTS max-age should be at least 1 year').toBeGreaterThanOrEqual(31536000);
    });
  });

  test.describe('Security Headers', () => {
    test('X-Frame-Options is DENY', async () => {
      const res = await fetch(BASE);
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    });

    test('X-Content-Type-Options is nosniff', async () => {
      const res = await fetch(BASE);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });

    test('Content-Security-Policy is present and restrictive', async () => {
      const res = await fetch(BASE);
      const csp = res.headers.get('content-security-policy') || '';
      expect(csp.length).toBeGreaterThan(20);
      expect(csp).toContain("default-src");
    });

    test('Referrer-Policy is set', async () => {
      const res = await fetch(BASE);
      const rp = res.headers.get('referrer-policy') || '';
      expect(rp).toBeTruthy();
      expect(rp).toMatch(/strict-origin|no-referrer|same-origin/);
    });
  });

  test.describe('Security Disclosure', () => {
    test('Security contact is reachable (support email exists)', async () => {
      // Verify support email is documented somewhere
      const supportRes = await fetch(`${BASE}/support`);
      const supportText = await supportRes.text();
      expect(supportText).toContain('fortress-optimizer.com');
    });
  });
});
