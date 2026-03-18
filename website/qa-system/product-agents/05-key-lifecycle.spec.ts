/**
 * Key Lifecycle + Tier Enforcement Agent
 *
 * Tests the full API key lifecycle that every product relies on:
 *   Register → Use → Check Usage → Rotate → Use New → Revoke → Verify Dead
 *
 * Also tests tier enforcement (free limits, auth rejection).
 *
 * Run: npx playwright test products/qa-system/agents/05-key-lifecycle.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

test.describe('Key Lifecycle: Full Cycle', () => {
  let key = '';

  test('1. Register new API key', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'lifecycle-test', tier: 'free' },
    });
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    key = data.api_key;
    expect(key).toMatch(/^fk_/);
    expect(key.length).toBeGreaterThan(10);
  });

  test('2. Key works immediately after registration', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': key },
    });
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.tier).toBe('free');
    expect(data.requests).toBe(0);
  });

  test('3. Key can optimize', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': key },
      data: { prompt: 'Lifecycle test prompt for optimization' },
    });
    expect(resp.status()).toBe(200);
  });

  test('4. Usage reflects the optimization', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': key },
    });
    const data = await resp.json();
    expect(data.requests).toBe(1);
    expect(data.tokens_optimized).toBeGreaterThan(0);
  });

  test('5. Rotate key — new key works, old dies', async ({ request }) => {
    const oldKey = key;
    const resp = await request.post(`${API}/api/keys/rotate`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    key = data.api_key;
    expect(key).toMatch(/^fk_/);
    expect(key).not.toBe(oldKey);

    // Old key should fail
    const oldResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': oldKey },
    });
    expect(oldResp.status()).toBe(401);

    // New key should work with preserved usage
    const newResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': key },
    });
    expect(newResp.status()).toBe(200);
    expect((await newResp.json()).requests).toBe(1);
  });

  test('6. Revoke key — permanently dead', async ({ request }) => {
    const resp = await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(resp.status()).toBe(200);

    // Should be permanently rejected
    const usageResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': key },
    });
    expect(usageResp.status()).toBe(401);

    // Can't rotate a revoked key
    const rotateResp = await request.post(`${API}/api/keys/rotate`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(rotateResp.status()).toBe(401);
  });
});

test.describe('Tier Enforcement', () => {
  let freeKey = '';

  test.beforeAll(async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'tier-test', tier: 'free' },
    });
    freeKey = (await resp.json()).api_key;
  });

  test.afterAll(async ({ request }) => {
    if (freeKey) await request.delete(`${API}/api/keys`, { headers: { Authorization: `Bearer ${freeKey}` } });
  });

  test('Free tier has 50K token limit', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': freeKey },
    });
    const data = await resp.json();
    expect(data.tier).toBe('free');
    expect(data.tokens_limit).toBe(50000);
  });

  test('Self-service registration only allows free tier', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'pro-attempt', tier: 'pro' },
    });
    expect(resp.status()).toBe(422);
  });

  test('Invalid key format rejected', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': 'not-a-valid-key' },
    });
    expect(resp.status()).toBe(401);
  });

  test('Missing auth rejected', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      data: { prompt: 'test' },
    });
    expect(resp.status()).toBe(401);
  });
});
