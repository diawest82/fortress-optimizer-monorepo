/**
 * Phase 3: API Client Unit Tests
 * Validates FortressClient HTTP behavior with mocked fetch
 */

import { FortressClient } from '../src/client';
import { FortressError, ResolvedFortressConfig, DEFAULTS } from '../src/types';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------
const originalFetch = global.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  global.fetch = handler as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeConfig(overrides: Partial<ResolvedFortressConfig> = {}): ResolvedFortressConfig {
  return {
    apiKey: 'fk_test_client_key_12345678',
    baseUrl: 'https://api.fortress-optimizer.com',
    level: 'balanced',
    provider: 'openai',
    timeout: 10_000,
    gracefulDegradation: true,
    minPromptLength: 50,
    ...overrides,
  };
}

function makeOptimizeResponse(optimizedPrompt: string, original = 100, optimized = 70) {
  return {
    request_id: 'opt_test_abc123',
    status: 'success',
    optimization: {
      optimized_prompt: optimizedPrompt,
      technique: 'deduplication+compression',
    },
    tokens: {
      original,
      optimized,
      savings: original - optimized,
      savings_percentage: Math.round(((original - optimized) / original) * 100),
    },
    timestamp: new Date().toISOString(),
  };
}

const USAGE_RESPONSE = {
  tier: 'pro',
  tokens_optimized: 50000,
  tokens_saved: 12000,
  requests: 200,
  tokens_limit: 'unlimited',
  tokens_remaining: 'unlimited',
  rate_limit: { requests_this_minute: 5, requests_this_day: 100, rpm_limit: 100, rpd_limit: 10000 },
  reset_date: '2026-04-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('FortressClient', () => {
  describe('optimize()', () => {
    it('should send POST to /api/optimize', async () => {
      let capturedUrl = '';
      let capturedMethod = '';

      mockFetch(async (url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method || '';
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      await client.optimize('test prompt that is long enough for validation');

      expect(capturedUrl).toBe('https://api.fortress-optimizer.com/api/optimize');
      expect(capturedMethod).toBe('POST');
    });

    it('should send Bearer and X-API-Key headers', async () => {
      let capturedHeaders: Record<string, string> = {};

      mockFetch(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const apiKey = 'fk_test_headers_key_12345678';
      const client = new FortressClient(makeConfig({ apiKey }));
      await client.optimize('test prompt that is long enough for validation');

      expect(capturedHeaders['Authorization']).toBe(`Bearer ${apiKey}`);
    });

    it('should send X-Client header as @fortress-optimizer/openclaw-skill', async () => {
      let capturedHeaders: Record<string, string> = {};

      mockFetch(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      await client.optimize('test prompt that is long enough for validation');

      expect(capturedHeaders['X-Client']).toBe('@fortress-optimizer/openclaw-skill');
    });

    it('should send prompt, level, and provider in body', async () => {
      let capturedBody: any;

      mockFetch(async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig({ level: 'aggressive', provider: 'anthropic' }));
      await client.optimize('my prompt text');

      expect(capturedBody).toEqual({
        prompt: 'my prompt text',
        level: 'aggressive',
        provider: 'anthropic',
      });
    });

    it('should return parsed OptimizeResponse', async () => {
      const expected = makeOptimizeResponse('the optimized prompt', 200, 140);

      mockFetch(async () => {
        return new Response(JSON.stringify(expected), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      const result = await client.optimize('test prompt that is long enough for validation');

      expect(result.optimization.optimized_prompt).toBe('the optimized prompt');
      expect(result.tokens.original).toBe(200);
      expect(result.tokens.optimized).toBe(140);
      expect(result.tokens.savings).toBe(60);
    });

    it('should throw FortressError on 401', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      await expect(client.optimize('test')).rejects.toThrow(FortressError);
      await expect(client.optimize('test')).rejects.toMatchObject({ statusCode: 401, isRetryable: false });
    });

    it('should throw FortressError on 429 (rate limit)', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      await expect(client.optimize('test')).rejects.toThrow(FortressError);
      await expect(client.optimize('test')).rejects.toMatchObject({ statusCode: 429, isRetryable: true });
    });

    it('should throw FortressError on 500', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      await expect(client.optimize('test')).rejects.toThrow(FortressError);
      await expect(client.optimize('test')).rejects.toMatchObject({ statusCode: 500, isRetryable: true });
    });

    it('should throw FortressError on timeout', async () => {
      mockFetch(async () => {
        const err = new DOMException('The operation was aborted', 'AbortError');
        throw err;
      });

      const client = new FortressClient(makeConfig({ timeout: 1 }));
      await expect(client.optimize('test')).rejects.toThrow(FortressError);
      await expect(client.optimize('test')).rejects.toMatchObject({ statusCode: 408 });
    });

    it('should throw FortressError on network failure', async () => {
      mockFetch(async () => {
        throw new TypeError('Failed to fetch');
      });

      const client = new FortressClient(makeConfig());
      await expect(client.optimize('test')).rejects.toThrow(FortressError);
      await expect(client.optimize('test')).rejects.toMatchObject({
        message: expect.stringContaining('Network error'),
      });
    });
  });

  describe('getUsage()', () => {
    it('should send GET to /api/usage', async () => {
      let capturedUrl = '';
      let capturedMethod = '';

      mockFetch(async (url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method || '';
        return new Response(JSON.stringify(USAGE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      await client.getUsage();

      expect(capturedUrl).toBe('https://api.fortress-optimizer.com/api/usage');
      expect(capturedMethod).toBe('GET');
    });

    it('should return parsed UsageResponse', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify(USAGE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new FortressClient(makeConfig());
      const result = await client.getUsage();

      expect(result.tier).toBe('pro');
      expect(result.tokens_saved).toBe(12000);
      expect(result.rate_limit.rpm_limit).toBe(100);
    });
  });

  describe('healthCheck()', () => {
    it('should return true on 200', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      });

      const client = new FortressClient(makeConfig());
      expect(await client.healthCheck()).toBe(true);
    });

    it('should return false on network error', async () => {
      mockFetch(async () => {
        throw new TypeError('Failed to fetch');
      });

      const client = new FortressClient(makeConfig());
      expect(await client.healthCheck()).toBe(false);
    });
  });
});

describe('FortressError', () => {
  it('should mark 429 as retryable', () => {
    const err = new FortressError('Rate limited', 429);
    expect(err.isRetryable).toBe(true);
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe('FortressError');
  });

  it('should mark 500+ as retryable', () => {
    expect(new FortressError('Server error', 500).isRetryable).toBe(true);
    expect(new FortressError('Service unavailable', 503).isRetryable).toBe(true);
  });

  it('should mark 401 as not retryable', () => {
    expect(new FortressError('Unauthorized', 401).isRetryable).toBe(false);
  });

  it('should mark errors without status code as not retryable', () => {
    expect(new FortressError('Network error').isRetryable).toBe(false);
  });
});
