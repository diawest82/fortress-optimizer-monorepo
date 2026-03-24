/**
 * API Backward Compatibility — verify response schemas don't break SDKs
 */

import { test, expect } from '@playwright/test';

const BACKEND = 'https://api.fortress-optimizer.com';

test.describe('API Backward Compat: Optimize Response', () => {

  test('Optimize response has status field', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/optimize`, {
      data: { prompt: 'test', level: 'balanced' },
      headers: { 'Authorization': 'Bearer test', 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    expect(data).toHaveProperty('status');
  });

  test('Health response has status + version + database', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('database');
  });

  test('Error responses have status + error fields', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/optimize`, {
      data: {},
      headers: { 'Authorization': 'Bearer invalid', 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('error');
    expect(data).toHaveProperty('error');
  });

  test('Health endpoint includes timestamp', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    const data = await res.json();
    expect(data).toHaveProperty('timestamp');
  });
});
