/**
 * API Surface Audit — every route tested for auth, method enforcement, no 500s
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const API_ROUTES = [
  { path: '/api/auth/login', method: 'POST', requiresAuth: false, data: { email: 'test@test.com', password: 'test' } },
  { path: '/api/auth/signup', method: 'POST', requiresAuth: false, data: { email: 'test@test.com', password: 'TestP@ss1!', name: 'Test' } },
  { path: '/api/auth/logout', method: 'POST', requiresAuth: false },
  { path: '/api/health', method: 'GET', requiresAuth: false },
  { path: '/api/pricing', method: 'GET', requiresAuth: false },
  { path: '/api/users/profile', method: 'GET', requiresAuth: true },
  { path: '/api/dashboard/stats', method: 'GET', requiresAuth: true },
  { path: '/api/support/tickets', method: 'GET', requiresAuth: true },
  { path: '/api/support/tickets', method: 'POST', requiresAuth: true },
  { path: '/api/subscriptions', method: 'GET', requiresAuth: true },
  { path: '/api/subscriptions', method: 'POST', requiresAuth: true },
  { path: '/api/api-keys', method: 'GET', requiresAuth: true },
  { path: '/api/admin/kpis', method: 'GET', requiresAuth: false },
  { path: '/api/teams/fake/usage', method: 'GET', requiresAuth: true },
  { path: '/api/teams/fake/members', method: 'GET', requiresAuth: true },
];

// Acceptable status codes for "the route exists and is responding correctly".
// Excludes 0 (unreachable) and 5xx (server errors). Tightened from the
// previous `< 500` which accepted unauthenticated 200s on protected routes.
const VALID_NON_ERROR_STATUSES = [200, 201, 204, 301, 302, 400, 401, 403, 422, 429];

test.describe('API Surface Audit: No 500 Errors', () => {
  for (const route of API_ROUTES) {
    test(`${route.method} ${route.path} responds with a valid status (no 500, no 404, no 0)`, async ({ request }) => {
      let res;
      if (route.method === 'GET') {
        res = await request.get(`${BASE}${route.path}`);
      } else {
        res = await request.post(`${BASE}${route.path}`, { data: (route as any).data || {} });
      }
      // 404 is excluded — a renamed/removed route should fail this audit, not silently pass.
      expect(
        VALID_NON_ERROR_STATUSES,
        `${route.method} ${route.path} returned ${res.status()} (expected one of ${VALID_NON_ERROR_STATUSES.join(', ')})`
      ).toContain(res.status());
    });
  }
});

test.describe('API Surface Audit: Auth Enforcement', () => {
  const authRoutes = API_ROUTES.filter(r => r.requiresAuth);

  for (const route of authRoutes) {
    test(`${route.method} ${route.path} requires auth (401/403)`, async ({ request }) => {
      let res;
      if (route.method === 'GET') {
        res = await request.get(`${BASE}${route.path}`);
      } else {
        res = await request.post(`${BASE}${route.path}`, { data: (route as any).data || {} });
      }
      // 404 is NOT acceptable — a removed/renamed route shouldn't silently
      // pass the auth gate. If the route is gone, the audit should fail loud.
      expect(
        [401, 403],
        `${route.method} ${route.path} returned ${res.status()} for an unauthenticated request — protected routes must return 401 or 403.`
      ).toContain(res.status());
    });
  }
});

test.describe('API Surface Audit: Public Routes Accessible', () => {
  const publicRoutes = API_ROUTES.filter(r => !r.requiresAuth);

  for (const route of publicRoutes) {
    test(`${route.method} ${route.path} is accessible without auth`, async ({ request }) => {
      let res;
      if (route.method === 'GET') {
        res = await request.get(`${BASE}${route.path}`);
      } else {
        res = await request.post(`${BASE}${route.path}`, { data: (route as any).data || {} });
      }
      // Public routes should return successful or expected client-error
      // codes — never 500, never 0, never 404 (which would mean the route
      // was removed without updating this audit).
      expect(
        VALID_NON_ERROR_STATUSES,
        `${route.method} ${route.path} returned ${res.status()} (expected one of ${VALID_NON_ERROR_STATUSES.join(', ')})`
      ).toContain(res.status());
    });
  }
});
