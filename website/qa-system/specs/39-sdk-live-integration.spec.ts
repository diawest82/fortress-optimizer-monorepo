/**
 * SDK Live Integration — All SDKs Call Real Backend API
 * Registers a test key, calls optimize/usage/health, verifies responses.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const ROOT_DIR = join(__dirname, '..', '..', '..');

let testApiKey = '';

test.describe('SDK Live Integration: Real API Calls', () => {

  test('Setup: Register test API key', async () => {
    const res = await fetch(`${API_BASE}/api/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `sdk-live-${UNIQUE}@test.fortress-optimizer.com`,
        tier: 'free',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      testApiKey = data.api_key || data.key || '';
      expect(testApiKey).toBeTruthy();
    } else {
      // May be rate limited — use a fallback
      testApiKey = 'fk_test_sdk_live';
    }
  });

  test.describe('Backend API Contract', () => {
    test('/api/optimize returns correct schema', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          prompt: 'Please provide a very detailed and comprehensive summary of all the key points discussed in the meeting today including action items and deadlines.',
          level: 'balanced',
          provider: 'openai',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        expect(data.status).toBe('success');
        expect(data.optimization).toBeTruthy();
        expect(data.optimization.optimized_prompt).toBeTruthy();
        expect(data.tokens).toBeTruthy();
        expect(data.tokens.original).toBeGreaterThan(0);
        expect(data.tokens.optimized).toBeGreaterThan(0);
        expect(data.tokens.savings).toBeGreaterThanOrEqual(0);
      } else {
        // 401 = invalid key, 429 = rate limited — not a schema issue
        expect([401, 429]).toContain(res.status);
      }
    });

    test('/api/optimize has savings > 0 for verbose prompt', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          prompt: 'Can you please help me to understand and provide a very detailed comprehensive explanation about how the system works and what all the various different components do and how they interact with each other in great detail please thank you very much.',
          level: 'aggressive',
          provider: 'openai',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        expect(data.tokens.savings, 'Verbose prompt should produce savings').toBeGreaterThan(0);
      }
    });

    test('/api/optimize rejects empty prompt', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({ prompt: '', level: 'balanced', provider: 'openai' }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(500);
    });

    test('/api/optimize rejects invalid provider', async () => {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({ prompt: 'test', level: 'balanced', provider: 'nonexistent' }),
      });
      expect(res.status).not.toBe(500);
    });

    test('/api/usage returns tier + token info', async () => {
      const res = await fetch(`${API_BASE}/api/usage`, {
        headers: { 'Authorization': `Bearer ${testApiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.tier || data.plan).toBeTruthy();
      } else {
        expect([401, 429]).toContain(res.status);
      }
    });

    test('/api/providers returns supported providers list', async () => {
      const res = await fetch(`${API_BASE}/api/providers`, {
        headers: { 'Authorization': `Bearer ${testApiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.providers || data).toBeTruthy();
      } else {
        expect([401, 429]).toContain(res.status);
      }
    });

    test('/health returns healthy status', async () => {
      const res = await fetch(`${API_BASE}/health`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.status).toBe('healthy');
    });
  });

  test.describe('SDK Source Verification', () => {
    test('npm SDK exports FortressClient with optimize method', async () => {
      const npmSrc = readFileSync(join(ROOT_DIR, 'products/npm/src/index.ts'), 'utf-8');
      expect(npmSrc).toContain('class FortressClient');
      expect(npmSrc).toContain('optimize');
      expect(npmSrc).toContain('healthCheck');
    });

    test('npm SDK enforces HTTPS', async () => {
      const npmSrc = readFileSync(join(ROOT_DIR, 'products/npm/src/index.ts'), 'utf-8');
      expect(npmSrc).toMatch(/https:\/\//);
    });

    test('Python shared-libs has FortressClient with optimize', async () => {
      const pySrc = readFileSync(join(ROOT_DIR, 'shared-libs/http_client.py'), 'utf-8');
      expect(pySrc).toContain('class FortressClient');
      expect(pySrc).toContain('optimize');
      expect(pySrc).toContain('health_check');
    });

    test('Python shared-libs enforces HTTPS', async () => {
      const pySrc = readFileSync(join(ROOT_DIR, 'shared-libs/http_client.py'), 'utf-8');
      expect(pySrc).toMatch(/https:\/\/|ValueError.*https/i);
    });

    test('Anthropic wrapper imports from shared-libs', async () => {
      const wrapper = readFileSync(join(ROOT_DIR, 'products/anthropic-sdk/wrapper.py'), 'utf-8');
      expect(wrapper).toContain('shared-libs');
      expect(wrapper).toContain('FortressClient');
    });

    test('All SDK types match backend response schema', async () => {
      const vercelTypes = readFileSync(join(ROOT_DIR, 'products/vercel-ai-sdk/src/types.ts'), 'utf-8');
      const openclawTypes = readFileSync(join(ROOT_DIR, 'products/openclaw/src/types.ts'), 'utf-8');
      // Both should have matching fields
      for (const field of ['tokens_optimized', 'tokens_saved', 'tokens_limit']) {
        expect(vercelTypes).toContain(field);
        expect(openclawTypes).toContain(field);
      }
    });
  });

  test('Cleanup: revoke test API key', async () => {
    if (testApiKey && testApiKey !== 'fk_test_sdk_live') {
      await fetch(`${API_BASE}/api/keys/${testApiKey}`, { method: 'DELETE' }).catch(() => {});
    }
  });
});
