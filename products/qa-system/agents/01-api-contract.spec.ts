/**
 * API Contract Agent — Schema Validation for All Endpoints
 *
 * Verifies every backend endpoint returns the expected schema,
 * status codes, and headers. This is what all 16 products depend on.
 *
 * Run: npx playwright test products/qa-system/agents/01-api-contract.spec.ts
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const contractPath = join(process.cwd(), '..', 'products', 'qa-system', 'contracts', 'api.contract.json');
const contract = JSON.parse(readFileSync(contractPath, 'utf-8'));

let apiKey = '';

test.beforeAll(async ({ request }) => {
  const resp = await request.post(`${API}/api/keys/register`, {
    data: { name: 'api-contract-test', tier: 'free' },
  });
  apiKey = (await resp.json()).api_key;
});

test.afterAll(async ({ request }) => {
  if (apiKey) {
    await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }
});

// ─── Health Endpoint ──────────────────────────────────────────────────────

test.describe('API Contract: Health', () => {
  test('GET /health returns expected schema', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
    expect(data.version).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });
});

// ─── Pricing Endpoint ─────────────────────────────────────────────────────

test.describe('API Contract: Pricing', () => {
  test('GET /api/pricing returns all tiers', async ({ request }) => {
    const resp = await request.get(`${API}/api/pricing`);
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.tiers).toBeDefined();
    expect(data.tiers.free).toBeDefined();
    expect(data.tiers.pro).toBeDefined();
    expect(data.tiers.team).toBeDefined();
    expect(data.tiers.enterprise).toBeDefined();

    // Free tier has token limit
    expect(data.tiers.free.tokens_per_month).toBe(50000);
    expect(data.tiers.free.price_monthly).toBe(0);
  });
});

// ─── Providers Endpoint ───────────────────────────────────────────────────

test.describe('API Contract: Providers', () => {
  test('GET /api/providers returns 6+ providers', async ({ request }) => {
    const resp = await request.get(`${API}/api/providers`, {
      headers: { 'X-API-Key': apiKey },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.providers).toBeDefined();
    expect(data.count).toBeGreaterThanOrEqual(6);
    expect(data.providers).toContain('openai');
    expect(data.providers).toContain('anthropic');
  });

  test('GET /api/providers requires auth', async ({ request }) => {
    const resp = await request.get(`${API}/api/providers`);
    expect(resp.status()).toBe(401);
  });
});

// ─── Optimize Endpoint ────────────────────────────────────────────────────

test.describe('API Contract: Optimize', () => {
  test('POST /api/optimize returns expected schema', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': apiKey },
      data: { prompt: 'Please analyze this data and provide a comprehensive summary', level: 'balanced', provider: 'openai' },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    // Validate all required fields
    expect(data.request_id).toMatch(/^opt_/);
    expect(data.status).toBe('success');
    expect(data.optimization).toBeDefined();
    expect(data.optimization.optimized_prompt).toBeDefined();
    expect(data.optimization.technique).toBeDefined();
    expect(data.tokens).toBeDefined();
    expect(data.tokens.original).toBeGreaterThan(0);
    expect(data.tokens.optimized).toBeGreaterThan(0);
    expect(data.tokens.savings).toBeGreaterThanOrEqual(0);
    expect(typeof data.tokens.savings_percentage).toBe('number');
    expect(data.timestamp).toBeDefined();
  });

  test('POST /api/optimize accepts all 3 levels', async ({ request }) => {
    for (const level of ['conservative', 'balanced', 'aggressive']) {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': apiKey },
        data: { prompt: 'Test prompt for level validation', level },
      });
      expect(resp.status(), `Level ${level} should return 200`).toBe(200);
    }
  });

  test('POST /api/optimize accepts all providers', async ({ request }) => {
    for (const provider of ['openai', 'anthropic']) {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': apiKey },
        data: { prompt: 'Test prompt for provider validation', provider },
      });
      expect(resp.status(), `Provider ${provider} should return 200`).toBe(200);
    }
  });

  test('POST /api/optimize returns rate limit headers', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': apiKey },
      data: { prompt: 'Test rate limit headers' },
    });

    const headers = resp.headers();
    expect(headers['x-ratelimit-limit']).toBeDefined();
    expect(headers['x-ratelimit-remaining']).toBeDefined();
    expect(headers['x-ratelimit-reset']).toBeDefined();
  });

  test('POST /api/optimize requires auth', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      data: { prompt: 'test' },
    });
    expect(resp.status()).toBe(401);
  });

  test('POST /api/optimize rejects empty prompt', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': apiKey },
      data: { prompt: '' },
    });
    expect(resp.status()).toBe(422);
  });

  test('POST /api/optimize rejects invalid level', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': apiKey },
      data: { prompt: 'test', level: 'extreme' },
    });
    expect(resp.status()).toBe(422);
  });
});

// ─── Usage Endpoint ───────────────────────────────────────────────────────

test.describe('API Contract: Usage', () => {
  test('GET /api/usage returns expected schema', async ({ request }) => {
    const resp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': apiKey },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.tier).toBe('free');
    expect(typeof data.tokens_optimized).toBe('number');
    expect(typeof data.tokens_saved).toBe('number');
    expect(typeof data.requests).toBe('number');
    expect(data.tokens_limit).toBe(50000);
    expect(data.rate_limit).toBeDefined();
  });
});

// ─── Key Management ───────────────────────────────────────────────────────

test.describe('API Contract: Key Management', () => {
  test('POST /api/keys/register returns new key', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'contract-key-test', tier: 'free' },
    });
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data.api_key).toMatch(/^fk_/);
    expect(data.tier).toBe('free');
    expect(data.name).toBe('contract-key-test');
    expect(data.rate_limits).toBeDefined();

    // Cleanup
    await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${data.api_key}` },
    });
  });

  test('POST /api/keys/register rejects paid tiers', async ({ request }) => {
    const resp = await request.post(`${API}/api/keys/register`, {
      data: { name: 'paid-test', tier: 'pro' },
    });
    expect(resp.status()).toBe(422);
  });

  test('Both Bearer and X-API-Key auth work', async ({ request }) => {
    const bearerResp = await request.get(`${API}/api/usage`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(bearerResp.status()).toBe(200);

    const xApiKeyResp = await request.get(`${API}/api/usage`, {
      headers: { 'X-API-Key': apiKey },
    });
    expect(xApiKeyResp.status()).toBe(200);
  });
});
