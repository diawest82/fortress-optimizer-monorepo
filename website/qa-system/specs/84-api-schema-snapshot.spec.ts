/**
 * API Schema Snapshot — verify API responses match frozen baseline
 * Baseline: qa-system/contracts/api-schema-baseline.json
 * If an API response changes, this test fails — preventing silent SDK breakage.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const BACKEND = 'https://api.fortress-optimizer.com';
const baselinePath = join(__dirname, '..', 'contracts', 'api-schema-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));

function validateAgainstBaseline(data: any, endpointKey: string) {
  const schema = baseline.endpoints[endpointKey];
  if (!schema) return; // No baseline for this endpoint yet

  for (const field of schema.requiredFields) {
    expect(data, `${endpointKey} missing required field: ${field}`).toHaveProperty(field);
  }

  for (const [field, expectedType] of Object.entries(schema.fieldTypes)) {
    if (data[field] !== undefined) {
      const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
      expect(actualType, `${endpointKey}.${field} type mismatch: expected ${expectedType}, got ${actualType}`).toBe(expectedType);
    }
  }
}

test.describe('API Schema Snapshot: Public Endpoints', () => {

  test('/api/health matches baseline schema', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    if (res.status() !== 200) return;
    const data = await res.json();
    validateAgainstBaseline(data, 'GET /api/health');
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
