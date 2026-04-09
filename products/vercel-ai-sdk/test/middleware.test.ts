/**
 * Tests for Fortress Vercel AI SDK middleware
 */

import { fortressMiddleware, createFortressClient, FortressError } from '../src';

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
function makeUserPrompt(text: string): any[] {
  return [
    {
      role: 'user' as const,
      content: [{ type: 'text' as const, text }],
    },
  ];
}

function makeSystemAndUserPrompt(system: string, user: string): any[] {
  return [
    {
      role: 'system' as const,
      content: system,
    },
    {
      role: 'user' as const,
      content: [{ type: 'text' as const, text: user }],
    },
  ];
}

function makeOptimizeResponse(optimizedPrompt: string, original = 100, optimized = 70) {
  return {
    request_id: 'req_test_123',
    status: 'success',
    optimization: {
      optimized_prompt: optimizedPrompt,
      technique: 'semantic_compression',
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

const TEST_API_KEY = 'fk_test_abc123';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('fortressMiddleware', () => {
  it('should throw if no API key is provided', () => {
    const originalEnv = process.env.FORTRESS_API_KEY;
    delete process.env.FORTRESS_API_KEY;

    expect(() => fortressMiddleware({})).toThrow('API key is required');

    process.env.FORTRESS_API_KEY = originalEnv;
  });

  it('should accept API key from config', () => {
    const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
    expect(middleware).toBeDefined();
    expect(middleware.transformParams).toBeDefined();
  });

  it('should accept API key from environment variable', () => {
    const originalEnv = process.env.FORTRESS_API_KEY;
    process.env.FORTRESS_API_KEY = TEST_API_KEY;

    const middleware = fortressMiddleware();
    expect(middleware).toBeDefined();

    process.env.FORTRESS_API_KEY = originalEnv;
  });

  describe('transformParams', () => {
    it('should optimize user prompt text', async () => {
      const optimizedText = 'Explain quantum computing concisely';

      mockFetch(async (url, init) => {
        expect(url).toContain('/api/optimize');
        const body = JSON.parse(init?.body as string);
        expect(body.prompt).toBe('Please explain quantum computing in great detail');
        expect(body.level).toBe('balanced');
        expect(body.provider).toBe('openai');

        return new Response(JSON.stringify(makeOptimizeResponse(optimizedText)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const params = {
        prompt: makeUserPrompt('Please explain quantum computing in great detail'),
        mode: { type: 'regular' as const },
        maxTokens: 1000,
      };

      const result = await middleware.transformParams!({ params } as any);

      // The last user message text should be replaced
      const userMsg = result.prompt.find((m: any) => m.role === 'user');
      const textPart = (userMsg!.content as any[]).find((p: any) => p.type === 'text');
      expect(textPart.text).toBe(optimizedText);
    });

    it('should pass through if no user message exists', async () => {
      mockFetch(async () => {
        throw new Error('fetch should not be called');
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const params = {
        prompt: [{ role: 'system' as const, content: 'You are helpful.' }],
        mode: { type: 'regular' as const },
      };

      const result = await middleware.transformParams!({ params } as any);
      expect(result).toEqual(params);
    });

    it('should preserve system messages while optimizing user message', async () => {
      const optimizedText = 'Optimized user text';

      mockFetch(async () => {
        return new Response(JSON.stringify(makeOptimizeResponse(optimizedText)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const prompt = makeSystemAndUserPrompt('You are a tutor.', 'Original user text');
      const params = { prompt, mode: { type: 'regular' as const } };

      const result = await middleware.transformParams!({ params } as any);

      // System message should be unchanged
      expect(result.prompt[0]).toEqual(prompt[0]);

      // User message should be optimized
      const userMsg = result.prompt.find((m: any) => m.role === 'user');
      const textPart = (userMsg!.content as any[]).find((p: any) => p.type === 'text');
      expect(textPart.text).toBe(optimizedText);
    });

    it('should use configured optimization level and provider', async () => {
      let capturedBody: any;

      mockFetch(async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({
        apiKey: TEST_API_KEY,
        level: 'aggressive',
        provider: 'anthropic',
      });

      const params = {
        prompt: makeUserPrompt('test prompt'),
        mode: { type: 'regular' as const },
      };

      await middleware.transformParams!({ params } as any);

      expect(capturedBody.level).toBe('aggressive');
      expect(capturedBody.provider).toBe('anthropic');
    });

    it('should send correct auth headers', async () => {
      let capturedHeaders: Record<string, string> = {};

      mockFetch(async (_url, init) => {
        const headers = init?.headers as Record<string, string>;
        capturedHeaders = headers;
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const params = {
        prompt: makeUserPrompt('test'),
        mode: { type: 'regular' as const },
      };

      await middleware.transformParams!({ params } as any);

      expect(capturedHeaders['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
    });

    it('should call onOptimization callback with metadata', async () => {
      mockFetch(async () => {
        return new Response(
          JSON.stringify(makeOptimizeResponse('short version', 200, 120)),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const onOptimization = jest.fn();
      const middleware = fortressMiddleware({
        apiKey: TEST_API_KEY,
        level: 'conservative',
        provider: 'google',
        onOptimization,
      });

      const params = {
        prompt: makeUserPrompt('a very long prompt'),
        mode: { type: 'regular' as const },
      };

      await middleware.transformParams!({ params } as any);

      expect(onOptimization).toHaveBeenCalledTimes(1);
      const metadata = onOptimization.mock.calls[0][0];
      expect(metadata.originalTokens).toBe(200);
      expect(metadata.optimizedTokens).toBe(120);
      expect(metadata.savings).toBe(80);
      expect(metadata.technique).toBe('semantic_compression');
      expect(metadata.level).toBe('conservative');
      expect(metadata.provider).toBe('google');
      expect(typeof metadata.durationMs).toBe('number');
    });
  });

  describe('graceful degradation', () => {
    it('should pass through original prompt on API error (default)', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const originalPrompt = makeUserPrompt('my important prompt');
      const params = {
        prompt: originalPrompt,
        mode: { type: 'regular' as const },
      };

      const result = await middleware.transformParams!({ params } as any);

      // Should return original params unchanged
      const userMsg = result.prompt.find((m: any) => m.role === 'user');
      const textPart = (userMsg!.content as any[]).find((p: any) => p.type === 'text');
      expect(textPart.text).toBe('my important prompt');
    });

    it('should pass through on network error', async () => {
      mockFetch(async () => {
        throw new TypeError('Failed to fetch');
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const params = {
        prompt: makeUserPrompt('test prompt'),
        mode: { type: 'regular' as const },
      };

      const result = await middleware.transformParams!({ params } as any);

      const userMsg = result.prompt.find((m: any) => m.role === 'user');
      const textPart = (userMsg!.content as any[]).find((p: any) => p.type === 'text');
      expect(textPart.text).toBe('test prompt');
    });

    it('should throw on API error when gracefulDegradation is false', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({
        apiKey: TEST_API_KEY,
        gracefulDegradation: false,
      });

      const params = {
        prompt: makeUserPrompt('test prompt'),
        mode: { type: 'regular' as const },
      };

      await expect(middleware.transformParams!({ params } as any)).rejects.toThrow(
        FortressError
      );
    });
  });

  describe('edge cases', () => {
    it('should not replace if optimized prompt is identical', async () => {
      const originalText = 'already optimal prompt';

      mockFetch(async () => {
        return new Response(
          JSON.stringify(makeOptimizeResponse(originalText, 10, 10)),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const params = {
        prompt: makeUserPrompt(originalText),
        mode: { type: 'regular' as const },
      };

      const result = await middleware.transformParams!({ params } as any);
      expect(result).toEqual(params);
    });

    it('should not replace if optimized prompt is empty', async () => {
      mockFetch(async () => {
        return new Response(
          JSON.stringify(makeOptimizeResponse('', 100, 0)),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const middleware = fortressMiddleware({ apiKey: TEST_API_KEY });
      const params = {
        prompt: makeUserPrompt('some prompt'),
        mode: { type: 'regular' as const },
      };

      const result = await middleware.transformParams!({ params } as any);

      const userMsg = result.prompt.find((m: any) => m.role === 'user');
      const textPart = (userMsg!.content as any[]).find((p: any) => p.type === 'text');
      expect(textPart.text).toBe('some prompt');
    });

    it('should use custom baseUrl', async () => {
      let capturedUrl = '';

      mockFetch(async (url) => {
        capturedUrl = url;
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({
        apiKey: TEST_API_KEY,
        baseUrl: 'https://custom.api.com',
      });

      const params = {
        prompt: makeUserPrompt('test'),
        mode: { type: 'regular' as const },
      };

      await middleware.transformParams!({ params } as any);
      expect(capturedUrl).toBe('https://custom.api.com/api/optimize');
    });

    it('should strip trailing slash from baseUrl', async () => {
      let capturedUrl = '';

      mockFetch(async (url) => {
        capturedUrl = url;
        return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const middleware = fortressMiddleware({
        apiKey: TEST_API_KEY,
        baseUrl: 'https://custom.api.com/',
      });

      const params = {
        prompt: makeUserPrompt('test'),
        mode: { type: 'regular' as const },
      };

      await middleware.transformParams!({ params } as any);
      expect(capturedUrl).toBe('https://custom.api.com/api/optimize');
    });
  });
});

describe('createFortressClient', () => {
  it('should return a FortressClient instance', () => {
    const client = createFortressClient({ apiKey: TEST_API_KEY });
    expect(client).toBeDefined();
    expect(typeof client.optimize).toBe('function');
    expect(typeof client.getUsage).toBe('function');
    expect(typeof client.healthCheck).toBe('function');
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
