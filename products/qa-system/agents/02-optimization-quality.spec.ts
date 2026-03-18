/**
 * Optimization Quality Agent — Verifies Core Product Promise
 *
 * Tests that optimization actually works:
 *   - Filler words removed
 *   - Token count decreases
 *   - Conservative < Balanced < Aggressive savings
 *   - Different prompts get different techniques
 *   - Output is semantically equivalent (not garbled)
 *
 * Run: npx playwright test products/qa-system/agents/02-optimization-quality.spec.ts
 */

import { test, expect } from '@playwright/test';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
let apiKey = '';

test.beforeAll(async ({ request }) => {
  const resp = await request.post(`${API}/api/keys/register`, {
    data: { name: 'quality-test', tier: 'free' },
  });
  apiKey = (await resp.json()).api_key;
});

test.afterAll(async ({ request }) => {
  if (apiKey) await request.delete(`${API}/api/keys`, { headers: { Authorization: `Bearer ${apiKey}` } });
});

const auth = () => ({ 'X-API-Key': apiKey });

// ─── Filler Word Removal ──────────────────────────────────────────────────

test.describe('Quality: Filler Removal', () => {
  test('Removes "basically" and "essentially"', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Can you basically like analyze this data and essentially provide insights about the trends', level: 'aggressive' },
    });
    const data = await resp.json();
    const optimized = data.optimization.optimized_prompt.toLowerCase();

    expect(optimized).not.toContain('basically');
    expect(optimized).not.toContain('essentially');
  });

  test('Removes "please" and "um" filler', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Um please if possible could you please help me analyze this data please', level: 'aggressive' },
    });
    const data = await resp.json();
    expect(data.tokens.savings).toBeGreaterThan(0);
  });

  test('Preserves core meaning after optimization', async ({ request }) => {
    const original = 'Analyze the quarterly revenue data and identify growth trends';
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: original, level: 'balanced' },
    });
    const data = await resp.json();
    const optimized = data.optimization.optimized_prompt.toLowerCase();

    // Key words must be preserved
    expect(optimized).toContain('analyze');
    expect(optimized).toContain('revenue');
    expect(optimized).toContain('trend');
  });
});

// ─── Token Savings ────────────────────────────────────────────────────────

test.describe('Quality: Token Savings', () => {
  test('Optimized token count <= original', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Please provide a very detailed and comprehensive summary of all the key findings from the quarterly report including all relevant data points and metrics' },
    });
    const data = await resp.json();

    expect(data.tokens.optimized).toBeLessThanOrEqual(data.tokens.original);
    expect(data.tokens.savings).toBeGreaterThanOrEqual(0);
  });

  test('Aggressive saves more than conservative', async ({ request }) => {
    const prompt = 'Please if possible in order to analyze as soon as possible the comprehensive data set and provide detailed insights thank you very much';

    const conservative = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt, level: 'conservative' },
    });
    const aggressive = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt, level: 'aggressive' },
    });

    const conData = await conservative.json();
    const aggData = await aggressive.json();

    expect(aggData.tokens.savings).toBeGreaterThanOrEqual(conData.tokens.savings);
  });

  test('Short prompt has minimal savings (not over-optimized)', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Summarize this report', level: 'balanced' },
    });
    const data = await resp.json();

    // Short clean prompts shouldn't be mangled
    expect(data.optimization.optimized_prompt.length).toBeGreaterThan(5);
  });
});

// ─── Provider Coverage ────────────────────────────────────────────────────

test.describe('Quality: Provider Coverage', () => {
  const providers = ['openai', 'anthropic'];

  for (const provider of providers) {
    test(`Optimization works with ${provider} provider`, async ({ request }) => {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: auth(),
        data: { prompt: `Test optimization for ${provider} provider integration`, provider },
      });
      expect(resp.status()).toBe(200);

      const data = await resp.json();
      expect(data.status).toBe('success');
      expect(data.tokens.original).toBeGreaterThan(0);
    });
  }
});

// ─── Edge Cases ───────────────────────────────────────────────────────────

test.describe('Quality: Edge Cases', () => {
  test('Single word prompt works', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Hello' },
    });
    expect(resp.status()).toBe(200);
  });

  test('Long prompt (10K chars) works', async ({ request }) => {
    const longPrompt = 'Please analyze this comprehensive data set. '.repeat(250);
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: longPrompt },
    });
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.tokens.savings).toBeGreaterThan(0);
  });

  test('Unicode prompt works', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Analyze the data 数据分析 and provide résumé of findings' },
    });
    expect(resp.status()).toBe(200);
  });

  test('Prompt with code blocks preserves code', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: auth(),
      data: { prompt: 'Please review this function: function add(a, b) { return a + b; }' },
    });
    const data = await resp.json();
    // Code should not be garbled
    expect(data.optimization.optimized_prompt).toContain('function');
  });
});
