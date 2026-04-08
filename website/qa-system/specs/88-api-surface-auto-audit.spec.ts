/**
 * API Surface Auto-Audit — every /api/* route, every verb
 *
 * Generalizes the 87-admin-surface-audit pattern to ALL /api/* routes.
 * Replaces the hardcoded list in 74-api-surface-audit with filesystem
 * auto-discovery, so new routes automatically get tested for auth posture
 * without anyone needing to remember to update a spec.
 *
 * Two layers, both auto-discovered:
 *   1) For every route.ts file under src/app/api/, parse out the exported
 *      HTTP methods (GET, POST, PUT, DELETE, PATCH) by regex.
 *   2) For every (route × method) combo, hit the live URL without any
 *      credentials and assert the right status:
 *        - Routes under PUBLIC_PREFIXES → must return a valid non-server-error code.
 *        - Everything else → must return 401 or 403.
 *
 * Excludes /api/admin/* — already covered by 87-admin-surface-audit.spec.ts.
 *
 * If a new public route is added under /api/, this spec will fail because
 * the default is "must require auth." The fix is to add the route's prefix
 * to PUBLIC_PREFIXES below — making the public surface area explicit.
 *
 * See: feedback_qa_admin_role_blindspot memory.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');
const API_DIR = join(WEBSITE_DIR, 'src/app/api');
const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

/**
 * Routes under these prefixes (relative to /api/) are considered public —
 * no auth required. Everything else is assumed protected.
 *
 * To add a new public route: add its prefix here. Keep this list small and
 * explicit — the default is "auth required."
 */
const PUBLIC_PREFIXES = [
  'auth/login',
  'auth/signup',
  'auth/logout',
  'auth/refresh',
  'auth/csrf-token',
  // /api/auth/admin/* deleted on 2026-04-08 — was a parallel JWT system
  // disconnected from the regular session, replaced by requireAdmin() on
  // each /api/admin/* route.
  'password',         // forgotten-password flow (request-reset, reset, validate)
  'health',
  'pricing',
  'webhook',
  'webhooks',
  'cron',
  'contact',
  'tools',
  'analytics/track',
  'community',
];

/**
 * Routes that are protected by a non-session mechanism (CRON_SECRET,
 * WEBHOOK_SECRET, ADMIN_SECRET, etc). They reject anonymous requests
 * with various status codes — accept any non-2xx for these.
 */
const SECRET_AUTH_PREFIXES = [
  'cron',
  'webhook',
  'webhooks',
];

/**
 * Files explicitly excluded — typically because they're covered by another
 * dedicated audit spec.
 */
const EXCLUDED_PREFIXES = [
  'admin/', // covered by 87-admin-surface-audit.spec.ts
];

/** Auto-discover all route.ts files under src/app/api/. */
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

/** Convert a route.ts filesystem path into the URL Next.js will serve it at. */
function routeFileToUrlPath(routeFile: string): string {
  const fromApiBase = relative(join(WEBSITE_DIR, 'src/app'), routeFile);
  const withoutFile = fromApiBase.replace(new RegExp(`${sep}route\\.ts$`), '');
  return (
    '/' +
    withoutFile
      .split(sep)
      .map(seg => (seg.startsWith('[') && seg.endsWith(']') ? 'test-id' : seg))
      .join('/')
  );
}

/** Detect which HTTP methods a route file exports. */
function detectMethods(routeFile: string): string[] {
  const source = readFileSync(routeFile, 'utf-8');
  const methods: string[] = [];
  for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(source)) {
      methods.push(m);
    }
  }
  return methods;
}

/** Path relative to /api/ — used for prefix matching against allowlists. */
function relativeApiPath(routeFile: string): string {
  const fromApi = relative(API_DIR, routeFile).replace(new RegExp(`${sep}route\\.ts$`), '');
  return fromApi.split(sep).join('/');
}

interface DiscoveredRoute {
  filePath: string;       // absolute path on disk
  apiPath: string;        // e.g. "users/profile"
  urlPath: string;        // e.g. "/api/users/profile"
  displayPath: string;    // for test names — relative to website dir
  methods: string[];      // exported HTTP methods
  isPublic: boolean;
  isSecretAuth: boolean;
  isExcluded: boolean;
}

const discoveredRoutes: DiscoveredRoute[] = findRouteFiles(API_DIR).map(filePath => {
  const apiPath = relativeApiPath(filePath);
  const isExcluded = EXCLUDED_PREFIXES.some(p => apiPath.startsWith(p.replace(/\/$/, '')));
  const isPublic = PUBLIC_PREFIXES.some(p => apiPath === p || apiPath.startsWith(`${p}/`));
  const isSecretAuth = SECRET_AUTH_PREFIXES.some(p => apiPath === p || apiPath.startsWith(`${p}/`));
  return {
    filePath,
    apiPath,
    urlPath: routeFileToUrlPath(filePath),
    displayPath: relative(WEBSITE_DIR, filePath),
    methods: detectMethods(filePath),
    isPublic,
    isSecretAuth,
    isExcluded,
  };
});

const VALID_NON_ERROR_STATUSES = [200, 201, 204, 301, 302, 400, 401, 403, 422, 429];

test.describe('API Surface Auto-Audit', () => {
  test('discovered at least 10 api routes (sanity check)', () => {
    const nonExcluded = discoveredRoutes.filter(r => !r.isExcluded);
    expect(
      nonExcluded.length,
      `Expected to find api routes under ${API_DIR}, found ${nonExcluded.length}.`
    ).toBeGreaterThan(10);
  });

  test.describe('Protected routes reject unauthenticated requests', () => {
    const protectedRoutes = discoveredRoutes.filter(
      r => !r.isExcluded && !r.isPublic && !r.isSecretAuth
    );

    for (const route of protectedRoutes) {
      for (const method of route.methods) {
        test(`${method} ${route.urlPath} returns 401/403 without credentials`, async ({
          request,
        }) => {
          let res;
          if (method === 'GET' || method === 'DELETE') {
            res = await request.fetch(`${BASE}${route.urlPath}`, { method });
          } else {
            res = await request.fetch(`${BASE}${route.urlPath}`, {
              method,
              data: {},
              headers: { 'Content-Type': 'application/json' },
            });
          }
          expect(
            [401, 403],
            `${route.displayPath} responded ${res.status()} to an unauthenticated ${method}. ` +
              `If this route is intentionally public, add its prefix to PUBLIC_PREFIXES in this spec.`
          ).toContain(res.status());
        });
      }
    }
  });

  test.describe('Public routes are reachable without credentials', () => {
    const publicRoutes = discoveredRoutes.filter(
      r => !r.isExcluded && r.isPublic && !r.isSecretAuth
    );

    for (const route of publicRoutes) {
      for (const method of route.methods) {
        test(`${method} ${route.urlPath} responds with a valid status`, async ({
          request,
        }) => {
          let res;
          if (method === 'GET' || method === 'DELETE') {
            res = await request.fetch(`${BASE}${route.urlPath}`, { method });
          } else {
            res = await request.fetch(`${BASE}${route.urlPath}`, {
              method,
              data: {},
              headers: { 'Content-Type': 'application/json' },
            });
          }
          expect(
            VALID_NON_ERROR_STATUSES,
            `${route.displayPath} (public) responded ${res.status()}, expected one of ${VALID_NON_ERROR_STATUSES.join(', ')}.`
          ).toContain(res.status());
        });
      }
    }
  });

  test.describe('Secret-authed routes (cron, webhook) reject anonymous', () => {
    const secretRoutes = discoveredRoutes.filter(
      r => !r.isExcluded && r.isSecretAuth
    );

    for (const route of secretRoutes) {
      for (const method of route.methods) {
        test(`${method} ${route.urlPath} rejects anonymous requests`, async ({
          request,
        }) => {
          let res;
          if (method === 'GET' || method === 'DELETE') {
            res = await request.fetch(`${BASE}${route.urlPath}`, { method });
          } else {
            res = await request.fetch(`${BASE}${route.urlPath}`, {
              method,
              data: {},
              headers: { 'Content-Type': 'application/json' },
            });
          }
          // Cron/webhook routes often return 401 (no secret) or 400
          // (no signature), but should NOT return 200 to an anonymous caller.
          expect(
            res.status(),
            `${route.displayPath} returned ${res.status()} — secret-authed routes must reject anonymous callers.`
          ).not.toBe(200);
          expect(res.status()).not.toBe(201);
        });
      }
    }
  });
});
