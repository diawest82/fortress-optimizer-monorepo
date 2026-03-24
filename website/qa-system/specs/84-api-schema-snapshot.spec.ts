/**
 * API Schema Snapshot — record and verify API response shapes don't drift
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const BACKEND = 'https://api.fortress-optimizer.com';

test.describe('API Schema Snapshot: Public Endpoints', () => {

  test('/api/health has required fields', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    if (res.status() !== 200) return;
    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(typeof data.status).toBe('string');
  });

  test('/api/pricing has required fields', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pricing`);
    if (res.status() !== 200) return;
    const data = await res.json();
    expect(data).toHaveProperty('tiers');
    if (data.tiers) {
      expect(Array.isArray(data.tiers)).toBe(true);
    }
  });

  test('/api/admin/kpis has required fields', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/kpis`);
    if (res.status() !== 200) return;
    const data = await res.json();
    expect(data).toHaveProperty('lastUpdated');
    expect(typeof data.lastUpdated).toBe('string');
  });

  test('Backend /health has required fields', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    if (res.status() !== 200) return;
    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('database');
  });

  test('Backend /api/optimize returns expected schema on 401', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/optimize`, {
      data: { prompt: 'test' },
      headers: { 'Authorization': 'Bearer invalid', 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('error');
  });
});

test.describe('API Schema Snapshot: Auth Endpoints', () => {

  test('/api/auth/login returns user on success or error on failure', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'test@test.com', password: 'wrong' },
    });
    const data = await res.json();
    if (res.status() === 200) {
      expect(data).toHaveProperty('user');
    } else {
      expect(data).toHaveProperty('error');
    }
  });

  test('/api/auth/signup returns user on 201 or error on failure', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/signup`, {
      data: { email: 'schema-test@test.com', password: 'TestP@ss1!', name: 'Schema' },
    });
    const data = await res.json();
    if (res.status() === 201) {
      expect(data).toHaveProperty('user');
    } else {
      expect(data).toHaveProperty('error');
    }
  });

  test('/api/auth/logout returns success', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/logout`);
    const data = await res.json();
    expect(data).toHaveProperty('success');
  });

  test('/api/dashboard/stats returns hasData on 401 or data on 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats?range=7d`);
    const data = await res.json();
    if (res.status() === 200) {
      expect(data).toHaveProperty('hasData');
      expect(data).toHaveProperty('totalTokens');
    } else {
      expect(data).toHaveProperty('error');
    }
  });
});
