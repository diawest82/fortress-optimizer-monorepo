/**
 * Auth Pattern Guard — CI gate that catches unprotected API routes
 * Greps every API route for missing auth. Prevents regression.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');
const API_DIR = join(WEBSITE_DIR, 'src/app/api');

test.describe('Auth Pattern Guard', () => {

  test('No API route trusts spoofable x-user-* headers', () => {
    // Bans both x-user-context (the original vulnerability) and x-user-id
    // (same vuln class — spoofable header used in place of session auth).
    // /api/subscriptions/invoices was caught using x-user-id on 2026-04-08,
    // letting any caller read any user's Stripe billing history.
    const result = execSync(
      `grep -rEn "x-user-context|x-user-id" ${API_DIR} --include="*.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    // Filter out comment lines (// and JSDoc * lines), spec files, and
    // lines that mention these strings only inside backticks/quotes in a
    // doc comment.
    const lines = result
      ? result.split('\n').filter(l => {
          if (l.includes('.spec.ts')) return false;
          // Strip leading "path:lineno:" prefix, then check if the actual
          // line content is a comment.
          const code = l.replace(/^[^:]+:\d+:\s*/, '');
          if (code.startsWith('//')) return false;
          if (code.startsWith('*')) return false;
          if (code.startsWith('/*')) return false;
          return true;
        })
      : [];
    expect(
      lines,
      `Spoofable identity header (x-user-context or x-user-id) used in:\n${lines.join('\n')}\n` +
      `Use verifyAuthToken() to extract identity from the signed JWT cookie instead.`
    ).toHaveLength(0);
  });

  test('No API route returns token in response body', () => {
    const result = execSync(
      `grep -rn "token.*response\\|response.*token" ${API_DIR} --include="*.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const lines = result ? result.split('\n').filter(l =>
      !l.includes('.spec.ts') && !l.includes('//') && !l.includes('csrf') &&
      !l.includes('CRON_SECRET') && !l.includes('webhook') && !l.includes('stripe')
    ) : [];
    // Filter to only actual token-in-body patterns
    const suspicious = lines.filter(l => l.match(/json.*\{.*token|token:.*response/i));
    expect(suspicious, `Token possibly returned in body:\n${suspicious.join('\n')}`).toHaveLength(0);
  });

  test('ALL API routes have auth or are explicitly public', () => {
    // Routes that intentionally don't require auth.
    // Keep this list small and explicit — every entry is a public surface.
    const PUBLIC_ROUTES = [
      'auth/',     // login, signup, logout, refresh, csrf, etc.
      'health',
      'pricing',
      'cron',      // protected by CRON_SECRET, not user session
      'webhook',   // protected by webhook signature
      'webhooks',
      'contact',
      'password/', // forgotten-password flow
      'tools/',    // public token-counter / cost-calculator widgets
      'analytics/track', // anonymous tracking endpoint
      'community/',// public community links
      'optimize',  // intentionally public per route comment ("no auth required for MVP")
    ];

    // STRONG auth signals — any of these in a route file proves it actually
    // verifies the caller's identity, not just that it touches headers or
    // does a Prisma user lookup. Tightened from the previous broad regex
    // that accepted weak signals like `prisma.user`, `userId`, `request.headers`.
    const STRONG_AUTH_PATTERNS = [
      /verifyAuthToken\s*\(/,
      /getServerSession\s*\(/,
      /requireAdmin\s*\(/,
      /verifyMutatingRequest\s*\(/,
      /getUserIdFromRequest\s*\(/,
      /jwt\.verify\s*\(/,
      /getToken\s*\(/,
      /cookies\.get\(['"]fortress_auth_token/,
      /CRON_SECRET/,
      /WEBHOOK_SECRET/,
      /ADMIN_SECRET/,
    ];

    // Find ALL route.ts files under /api/
    const allRoutes = execSync(
      `find "${API_DIR}" -name "route.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);

    const unprotected: string[] = [];

    for (const routeFile of allRoutes) {
      const relative = routeFile.replace(API_DIR + '/', '').replace('/route.ts', '');
      if (PUBLIC_ROUTES.some(pub => relative.startsWith(pub))) continue;

      const content = require('fs').readFileSync(routeFile, 'utf-8');
      const hasAuth = STRONG_AUTH_PATTERNS.some(p => p.test(content));

      if (!hasAuth) {
        unprotected.push(relative);
      }
    }

    // Routes flagged by the tight regex that are KNOWN broken/incomplete stubs
    // — they have no real auth and should be fixed (not just exempted forever).
    // Each entry below has a corresponding cleanup todo. Remove from this list
    // as the underlying route is fixed.
    //
    // NOTE: admin/ is NOT exempted — admin routes MUST use requireAdmin().
    // See feedback_qa_admin_role_blindspot memory.
    const KNOWN_BROKEN_STUBS = [
      // FIXED on 2026-04-08 — kept here as comment so the diff is reviewable:
      //   security/sessions     — now uses verifyAuthToken + per-user scope
      //   security/metrics      — now uses verifyAuthToken
      //   security/dashboard-metrics — now uses requireAdmin
      //   mfa/totp-setup        — now uses verifyAuthToken, ignores body email
      //   mfa/verify            — now uses verifyAuthToken
      //   analytics             — GET now uses requireAdmin; POST stays public
      //   analytics/metrics     — now uses requireAdmin
      //
      // The remaining list below is the ACTUAL set of routes that the
      // strong-auth regex doesn't recognize — investigated and confirmed
      // unprotected (or protected by a pattern not in STRONG_AUTH_PATTERNS).

      // (populated below after running the test)
    ];

    // Match the route prefix exactly OR followed by '/' so 'emails' matches
    // both bare /api/emails and /api/emails/[id], without accidentally
    // matching /api/emails-other.
    const reallyUnprotected = unprotected.filter(
      r => !KNOWN_BROKEN_STUBS.some(stub => r === stub || r.startsWith(`${stub}/`))
    );

    expect(
      reallyUnprotected,
      `UNPROTECTED API routes (no strong auth pattern found):\n${reallyUnprotected.map(r => `  /api/${r}`).join('\n')}\n\n` +
      `Each route must do ONE of these:\n` +
      `  1) Call a known auth helper (verifyAuthToken, requireAdmin, etc)\n` +
      `  2) Be added to PUBLIC_ROUTES (intentionally public)\n` +
      `  3) Be added to KNOWN_BROKEN_STUBS with a TODO\n`
    ).toHaveLength(0);
  });

  test('No hardcoded secrets in API routes', () => {
    // Check for obvious secret patterns (not env vars)
    const { readFileSync, readdirSync, statSync } = require('fs');

    function findFiles(dir: string, ext: string): string[] {
      const files: string[] = [];
      try {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          try {
            if (statSync(full).isDirectory()) files.push(...findFiles(full, ext));
            else if (full.endsWith(ext)) files.push(full);
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
      return files;
    }

    const tsFiles = findFiles(API_DIR, '.ts');
    const violations: string[] = [];
    for (const f of tsFiles) {
      if (f.includes('.spec.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      if (content.match(/sk_live_[a-zA-Z0-9]{10,}|sk_test_[a-zA-Z0-9]{10,}/)) {
        violations.push(f);
      }
    }
    expect(violations, `Hardcoded Stripe keys in:\n${violations.join('\n')}`).toHaveLength(0);
  });

  test('Webhook routes verify signatures', () => {
    const result = execSync(
      `grep -rn "webhook" ${API_DIR} --include="*.ts" -l 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const webhookFiles = result ? result.split('\n').filter(Boolean) : [];
    for (const file of webhookFiles) {
      const content = execSync(`cat "${file}"`, { encoding: 'utf-8' });
      expect(content, `${file} missing signature verification`).toMatch(/verify|signature|secret|WEBHOOK_SECRET/i);
    }
  });
});
