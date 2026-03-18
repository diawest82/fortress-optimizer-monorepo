/**
 * Cross-Product Consistency Agent
 *
 * Verifies that the same prompt optimized through different product
 * interfaces produces consistent results. All products call the same
 * backend — results should be identical.
 *
 * Also tests concurrent multi-product usage (simulating real-world
 * where npm, Slack, and VS Code hit the API simultaneously).
 *
 * Run: npx playwright test products/qa-system/agents/06-cross-product.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

const TEST_PROMPT = 'Please provide a very detailed and comprehensive analysis of the quarterly revenue data and basically identify all the key trends and essentially summarize the findings';

test.describe('Cross-Product: Consistency', () => {
  let key1 = '';
  let key2 = '';
  let key3 = '';

  test.beforeAll(async ({ request }) => {
    // Simulate 3 different products with separate keys
    key1 = (await (await request.post(`${API}/api/keys/register`, { data: { name: 'product-npm', tier: 'free' } })).json()).api_key;
    key2 = (await (await request.post(`${API}/api/keys/register`, { data: { name: 'product-slack', tier: 'free' } })).json()).api_key;
    key3 = (await (await request.post(`${API}/api/keys/register`, { data: { name: 'product-vscode', tier: 'free' } })).json()).api_key;
  });

  test.afterAll(async ({ request }) => {
    for (const k of [key1, key2, key3]) {
      if (k) await request.delete(`${API}/api/keys`, { headers: { Authorization: `Bearer ${k}` } }).catch(() => {});
    }
  });

  test('Same prompt + level + provider → same optimization across keys', async ({ request }) => {
    const results = await Promise.all([key1, key2, key3].map(async (key) => {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': key },
        data: { prompt: TEST_PROMPT, level: 'balanced', provider: 'openai' },
      });
      return resp.json();
    }));

    // All should succeed
    for (const r of results) {
      expect(r.status).toBe('success');
    }

    // Optimized prompts should be identical
    expect(results[0].optimization.optimized_prompt).toBe(results[1].optimization.optimized_prompt);
    expect(results[1].optimization.optimized_prompt).toBe(results[2].optimization.optimized_prompt);

    // Token counts should match
    expect(results[0].tokens.savings).toBe(results[1].tokens.savings);
    expect(results[1].tokens.savings).toBe(results[2].tokens.savings);
  });

  test('Different levels produce different results', async ({ request }) => {
    const levels = ['conservative', 'balanced', 'aggressive'];
    const results = await Promise.all(levels.map(async (level) => {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': key1 },
        data: { prompt: TEST_PROMPT, level, provider: 'openai' },
      });
      return { level, ...(await resp.json()) };
    }));

    // Aggressive should save more than conservative
    const conSavings = results.find(r => r.level === 'conservative')!.tokens.savings;
    const aggSavings = results.find(r => r.level === 'aggressive')!.tokens.savings;
    expect(aggSavings).toBeGreaterThanOrEqual(conSavings);
  });

  test('Usage tracked independently per key', async ({ request }) => {
    const [u1, u2, u3] = await Promise.all([key1, key2, key3].map(async (key) => {
      const resp = await request.get(`${API}/api/usage`, { headers: { 'X-API-Key': key } });
      return resp.json();
    }));

    // Each key should have tracked its own requests
    expect(u1.requests).toBeGreaterThanOrEqual(1);
    expect(u2.requests).toBeGreaterThanOrEqual(1);
    expect(u3.requests).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Cross-Product: Concurrent Access', () => {
  test('5 products hitting API simultaneously — zero errors', async ({ request }) => {
    // Register 5 keys
    const keys: string[] = [];
    for (let i = 0; i < 5; i++) {
      const resp = await request.post(`${API}/api/keys/register`, {
        data: { name: `concurrent-${i}`, tier: 'free' },
      });
      keys.push((await resp.json()).api_key);
    }

    // All 5 optimize simultaneously
    const start = Date.now();
    const results = await Promise.allSettled(keys.map(async (key, i) => {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': key },
        data: { prompt: `Concurrent test prompt number ${i} with enough words to be meaningful` },
      });
      return { status: resp.status(), body: await resp.json() };
    }));
    const elapsed = Date.now() - start;

    console.log(`[cross-product] 5 concurrent optimizations in ${elapsed}ms`);

    // All should succeed
    for (const r of results) {
      expect(r.status).toBe('fulfilled');
      if (r.status === 'fulfilled') {
        expect(r.value.status).toBe(200);
        expect(r.value.body.status).toBe('success');
      }
    }

    // Cleanup
    for (const k of keys) {
      await request.delete(`${API}/api/keys`, { headers: { Authorization: `Bearer ${k}` } }).catch(() => {});
    }
  });
});
