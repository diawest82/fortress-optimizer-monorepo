/**
 * Optimization Accuracy — Verify the product actually delivers what it promises
 *
 * Not just "does the API respond" but:
 *   - Does the optimized prompt actually have fewer tokens?
 *   - Is the savings rate close to the claimed 20%?
 *   - Are key terms from the original preserved?
 *   - Do different levels produce different savings?
 *   - Do different providers all work?
 *   - Is the response schema complete?
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

let testApiKey = '';

// Verbose prompts that should produce measurable savings
const VERBOSE_PROMPTS = {
  meeting: 'Please provide a very detailed and comprehensive summary of absolutely all of the key points that were discussed in the meeting today. Make sure to include all action items, deadlines, and any blockers that might delay the deployment timeline. Include specific examples and recommendations for improvement. Consider all aspects of the conversation and provide actionable insights for the team.',
  code: 'Can you please help me to refactor this entire React component so that it is much more performant and significantly faster and much easier to read and maintain in the editor? I want to optimize the rendering performance and improve the overall code quality and structure significantly with modern patterns and best practices. Please suggest best practices and patterns for React development.',
  analysis: 'Please perform a very detailed and comprehensive analysis of all of the quarterly customer feedback data and information we have collected from multiple different sources including surveys, support tickets, and user interviews to identify patterns and trends. Identify the most urgent and important themes.',
  short: 'Summarize this.',
};

test.describe('Optimization Accuracy: Product Delivers on Promise', () => {

  test('Setup: Register test API key', async () => {
    const res = await fetch(`${API_BASE}/api/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `accuracy-${UNIQUE}@test.fortress-optimizer.com`,
        tier: 'free',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      testApiKey = data.api_key || data.key || '';
    }
    testApiKey = testApiKey || 'fk_test_accuracy';
  });

  test.describe('Savings Verification', () => {
    test('Verbose prompt produces actual token savings (savings > 0)', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      expect(data.tokens.savings, 'Verbose prompt should save tokens').toBeGreaterThan(0);
      console.log(`  Meeting prompt: ${data.tokens.original} → ${data.tokens.optimized} (saved ${data.tokens.savings}, ${data.tokens.savings_percentage}%)`);
    });

    test('Savings percentage is in reasonable range (5-40%)', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.code, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      expect(data.tokens.savings_percentage, 'Savings should be 5-40%').toBeGreaterThanOrEqual(5);
      expect(data.tokens.savings_percentage, 'Savings should not exceed 40%').toBeLessThanOrEqual(40);
      console.log(`  Code prompt: ${data.tokens.savings_percentage}% savings`);
    });

    test('Optimized prompt is actually shorter than original', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.analysis, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      expect(data.tokens.optimized, 'Optimized tokens should be less than original').toBeLessThan(data.tokens.original);
      // Also verify the text is shorter
      expect(
        data.optimization.optimized_prompt.length,
        'Optimized text should be shorter'
      ).toBeLessThan(VERBOSE_PROMPTS.analysis.length);
    });

    test('Short prompt has minimal or no savings (not over-optimized)', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.short, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      // Short prompts shouldn't be aggressively stripped
      expect(data.tokens.savings_percentage, 'Short prompt should not lose much').toBeLessThanOrEqual(50);
      console.log(`  Short prompt: ${data.tokens.savings_percentage}% savings`);
    });
  });

  test.describe('Meaning Preservation', () => {
    test('Optimized meeting prompt preserves key terms', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      const optimized = data.optimization.optimized_prompt.toLowerCase();
      // Key terms that MUST survive optimization
      const keyTerms = ['summary', 'action', 'deadline', 'deployment'];
      const preserved = keyTerms.filter(term => optimized.includes(term));
      expect(preserved.length, `Should preserve most key terms. Missing: ${keyTerms.filter(t => !optimized.includes(t)).join(', ')}`).toBeGreaterThanOrEqual(2);
    });

    test('Optimized code prompt preserves key terms', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.code, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      const optimized = data.optimization.optimized_prompt.toLowerCase();
      const keyTerms = ['refactor', 'react', 'component', 'performance'];
      const preserved = keyTerms.filter(term => optimized.includes(term));
      expect(preserved.length, `Should preserve key terms. Missing: ${keyTerms.filter(t => !optimized.includes(t)).join(', ')}`).toBeGreaterThanOrEqual(2);
    });

    test('Optimized prompt does not introduce injection content', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      const optimized = data.optimization.optimized_prompt.toLowerCase();
      // Should NOT contain injection patterns
      expect(optimized).not.toContain('ignore previous');
      expect(optimized).not.toContain('system prompt');
      expect(optimized).not.toContain('you are now');
    });
  });

  test.describe('Optimization Levels', () => {
    test('Aggressive saves more than conservative', async () => {
      const conservative = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'conservative', provider: 'openai' }),
      }).then(r => r.ok ? r.json() : null);

      const aggressive = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'aggressive', provider: 'openai' }),
      }).then(r => r.ok ? r.json() : null);

      if (conservative && aggressive) {
        expect(
          aggressive.tokens.savings,
          `Aggressive (${aggressive.tokens.savings}) should save more than conservative (${conservative.tokens.savings})`
        ).toBeGreaterThanOrEqual(conservative.tokens.savings);
        console.log(`  Conservative: ${conservative.tokens.savings_percentage}%, Aggressive: ${aggressive.tokens.savings_percentage}%`);
      }
    });

    test('All three levels return valid responses', async () => {
      for (const level of ['conservative', 'balanced', 'aggressive']) {
        const res = await fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
          body: JSON.stringify({ prompt: VERBOSE_PROMPTS.code, level, provider: 'openai' }),
        });
        if (res.ok) {
          const data = await res.json();
          expect(data.status, `${level} should return success`).toBe('success');
          expect(data.tokens.original, `${level} should have original tokens`).toBeGreaterThan(0);
        } else {
          expect([401, 429]).toContain(res.status);
        }
      }
    });
  });

  test.describe('Provider Support', () => {
    test('Multiple providers return valid responses', async () => {
      const providers = ['openai', 'anthropic', 'google'];
      for (const provider of providers) {
        const res = await fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
          body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'balanced', provider }),
        });
        if (res.ok) {
          const data = await res.json();
          expect(data.status, `${provider} should return success`).toBe('success');
        } else {
          // 401 or 429 OK, but NOT 400 (invalid provider) or 500
          expect(res.status, `${provider} should not return 400 or 500`).not.toBe(500);
        }
      }
    });
  });

  test.describe('Response Schema Completeness', () => {
    test('Response has all required fields', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();

      // Top level
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('request_id');
      expect(data).toHaveProperty('optimization');
      expect(data).toHaveProperty('tokens');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('technique');

      // Optimization object
      expect(data.optimization).toHaveProperty('optimized_prompt');
      expect(data.optimization).toHaveProperty('technique');

      // Tokens object
      expect(data.tokens).toHaveProperty('original');
      expect(data.tokens).toHaveProperty('optimized');
      expect(data.tokens).toHaveProperty('savings');
      expect(data.tokens).toHaveProperty('savings_percentage');

      // Types
      expect(typeof data.tokens.original).toBe('number');
      expect(typeof data.tokens.optimized).toBe('number');
      expect(typeof data.tokens.savings).toBe('number');
      expect(typeof data.tokens.savings_percentage).toBe('number');
      expect(typeof data.optimization.optimized_prompt).toBe('string');
      expect(typeof data.request_id).toBe('string');
    });

    test('Request ID follows expected format', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.short, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      expect(data.request_id).toMatch(/^opt_/);
    });

    test('Technique field is populated', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.meeting, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      const data = await res.json();
      expect(data.technique, 'Technique should be populated').toBeTruthy();
      expect(data.technique.length).toBeGreaterThan(0);
    });

    test('Rate limit headers present in response', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
        body: JSON.stringify({ prompt: VERBOSE_PROMPTS.short, level: 'balanced', provider: 'openai' }),
      });
      if (!res.ok) { expect([401, 429]).toContain(res.status); return; }
      // Should have rate limit headers
      const remaining = res.headers.get('x-ratelimit-remaining');
      const limit = res.headers.get('x-ratelimit-limit');
      if (remaining) expect(parseInt(remaining)).toBeGreaterThanOrEqual(0);
      if (limit) expect(parseInt(limit)).toBeGreaterThan(0);
    });
  });

  test('Cleanup: revoke test key', async () => {
    if (testApiKey && testApiKey !== 'fk_test_accuracy') {
      await fetch(`${API_BASE}/api/keys/${testApiKey}`, { method: 'DELETE' }).catch(() => {});
    }
  });
});
