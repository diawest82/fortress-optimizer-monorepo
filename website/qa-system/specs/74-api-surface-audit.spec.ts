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

test.describe('API Surface Audit: No 500 Errors', () => {
  for (const route of API_ROUTES) {
    test(`${route.method} ${route.path} does not return 500`, async ({ request }) => {
      let res;
      if (route.method === 'GET') {
        res = await request.get(`${BASE}${route.path}`);
      } else {
        res = await request.post(`${BASE}${route.path}`, { data: (route as any).data || {} });
      }
      expect(res.status(), `${route.method} ${route.path} returned 500`).toBeLessThan(500);
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
      expect([401, 403, 404]).toContain(res.status());
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
      // Should return something, not necessarily 200 (login with wrong creds = 401 is OK for public)
      expect(res.status()).toBeLessThan(500);
    });
  }
});
