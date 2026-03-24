/**
 * CORS Enforcement — verify all API routes have correct CORS headers
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const API_ENDPOINTS = [
  '/api/health',
  '/api/pricing',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/dashboard/stats',
  '/api/support/tickets',
  '/api/admin/kpis',
];

test.describe('CORS Enforcement', () => {

  for (const endpoint of API_ENDPOINTS) {
    test(`${endpoint} does not allow wildcard CORS`, async ({ request }) => {
      const res = await request.get(`${BASE}${endpoint}`);
      const cors = res.headers()['access-control-allow-origin'];
      if (cors) {
        expect(cors, `${endpoint} has wildcard CORS`).not.toBe('*');
      }
      // Not having CORS headers is also acceptable (browser enforces same-origin)
    });
  }

  test('Backend CORS is not wildcard', async ({ request }) => {
    const res = await request.get('https://api.fortress-optimizer.com/health');
    const cors = res.headers()['access-control-allow-origin'];
    if (cors) {
      expect(cors).not.toBe('*');
    }
  });
});
