/**
 * Admin Surface Audit — Coverage gap closure for the role × admin × auth matrix
 *
 * Background: prior to 2026-04-07, every /api/admin/* route shipped without
 * any server-side auth check. The test suite missed it because:
 *   - 83-auth-pattern-guard explicitly exempted admin/ routes
 *   - 74-api-surface-audit hardcoded a route list and marked admin/kpis as public
 *   - 63-admin-chains and 86-horizontal-privilege-escalation only asserted
 *     status < 500, which passes for unauthenticated 200s
 *
 * This spec closes that gap with two layers:
 *   1) STATIC: auto-discover every admin route file and assert it imports an
 *      auth helper AND references a role check. Runs in CI on every push, no
 *      server required.
 *   2) RUNTIME: hit each discovered admin endpoint without credentials and
 *      assert 401/403. Catches deploy-time regressions.
 *
 * Both layers are auto-discovered from the filesystem — there is no hardcoded
 * route list to drift out of sync.
 *
 * See: feedback_qa_admin_role_blindspot memory for the post-mortem.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');
const ADMIN_DIR = join(WEBSITE_DIR, 'src/app/api/admin');
const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

// Patterns the static check looks for. Any one of these in the route source
// counts as "auth is being verified."
const AUTH_HELPER_PATTERNS = [
  /verifyAuthToken\s*\(/,
  /getServerSession\s*\(/,
  /requireAdmin\s*\(/,
  /jwt\.verify\s*\(/,
  /getToken\s*\(/,
];

// Patterns that count as "role is being checked." We want BOTH auth AND role.
const ROLE_CHECK_PATTERNS = [
  /role\s*===?\s*['"]admin['"]/,
  /['"]admin['"]\s*===?\s*\.?role/,
  /requireAdmin\s*\(/,
  /isAdmin/,
  /\.role\s*!==?\s*['"]admin['"]/,
];

/**
 * Recursively find all `route.ts` files under a directory.
 */
function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) {
      out.push(...findRouteFiles(full));
    } else if (entry === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

/**
 * Convert a route.ts filesystem path into the URL path Next.js will serve it at.
 * Replaces [param] segments with placeholder values so we can hit the URL.
 *
 *   src/app/api/admin/users/[userId]/route.ts  →  /api/admin/users/test-id
 *   src/app/api/admin/kpis/route.ts            →  /api/admin/kpis
 */
function routeFileToUrlPath(routeFile: string): string {
  const fromApi = relative(join(WEBSITE_DIR, 'src/app'), routeFile);
  // Drop trailing /route.ts
  const withoutFile = fromApi.replace(new RegExp(`${sep}route\\.ts$`), '');
  // Normalize path separators for URL and substitute [param] segments
  const url =
    '/' +
    withoutFile
      .split(sep)
      .map(seg => (seg.startsWith('[') && seg.endsWith(']') ? 'test-id' : seg))
      .join('/');
  return url;
}

const adminRouteFiles = findRouteFiles(ADMIN_DIR);

test.describe('Admin Surface Audit', () => {
  test('discovers at least one admin route (sanity check)', () => {
    expect(
      adminRouteFiles.length,
      `Expected to find admin route files under ${ADMIN_DIR}, found none. ` +
        `If admin routes have moved, update ADMIN_DIR in this spec.`
    ).toBeGreaterThan(0);
  });

  test.describe('Static: every admin route file verifies auth + role at source level', () => {
    for (const routeFile of adminRouteFiles) {
      const display = relative(WEBSITE_DIR, routeFile);
      test(`${display} imports an auth helper`, () => {
        const source = readFileSync(routeFile, 'utf-8');
        const hasAuth = AUTH_HELPER_PATTERNS.some(p => p.test(source));
        expect(
          hasAuth,
          `${display} does not import any known auth helper. ` +
            `Expected one of: verifyAuthToken, getServerSession, requireAdmin, jwt.verify, getToken. ` +
            `This is the bug that let /api/admin/* ship unauthenticated. Do not exempt admin routes.`
        ).toBe(true);
      });

      test(`${display} performs a role check`, () => {
        const source = readFileSync(routeFile, 'utf-8');
        const hasRole = ROLE_CHECK_PATTERNS.some(p => p.test(source));
        expect(
          hasRole,
          `${display} verifies a session but does not gate on role === 'admin'. ` +
            `Auth alone is not enough — any logged-in user would pass. ` +
            `Use requireAdmin() or check user.role === 'admin' explicitly.`
        ).toBe(true);
      });
    }
  });

  test.describe('Runtime: every admin route rejects unauthenticated requests', () => {
    for (const routeFile of adminRouteFiles) {
      const urlPath = routeFileToUrlPath(routeFile);
      const display = relative(WEBSITE_DIR, routeFile);

      test(`GET ${urlPath} returns 401/403 without credentials`, async ({ request }) => {
        const res = await request.get(`${BASE}${urlPath}`);
        expect(
          [401, 403],
          `${display} responded ${res.status()} to an unauthenticated GET ${urlPath}. ` +
            `Admin routes must reject unauthenticated requests with 401 or 403.`
        ).toContain(res.status());
      });
    }
  });
});
