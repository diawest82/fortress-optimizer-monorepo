/**
 * Phase 6: Integration Tests
 * End-to-end skill registration, bootstrap, and execution flow
 */

import { registerSkill } from '../src/index';
import { FortressError } from '../src/types';

// ---------------------------------------------------------------------------
// Mock fetch
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
let optimizeCallCount = 0;

function makeOptimizeResponse(optimizedPrompt: string, original = 100, optimized = 70) {
  return {
    request_id: `opt_int_${++optimizeCallCount}`,
    status: 'success',
    optimization: { optimized_prompt: optimizedPrompt, technique: 'compression' },
    tokens: {
      original,
      optimized,
      savings: original - optimized,
      savings_percentage: Math.round(((original - optimized) / original) * 100),
    },
    timestamp: new Date().toISOString(),
  };
}

beforeEach(() => {
  optimizeCallCount = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Integration: Full Skill Flow', () => {
  it('should complete registerSkill → bootstrap → assemble round-trip', async () => {
    // Health check for bootstrap
    let requestCount = 0;
    mockFetch(async (url) => {
      requestCount++;
      if (url.includes('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      if (url.includes('/api/optimize')) {
        return new Response(JSON.stringify(makeOptimizeResponse('optimized output')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });

    const skill = registerSkill({ apiKey: 'fk_test_integration_key_123' });

    // Bootstrap
    await skill.contextEngine.bootstrap();
    expect(requestCount).toBe(1); // health check

    // Ingest + assemble
    skill.contextEngine.ingest('a long prompt needing optimization');
    const result = await skill.contextEngine.assemble();

    expect(result).toBe('optimized output');
    expect(requestCount).toBe(2); // health + optimize
  });

  it('should have no state leakage between sequential optimizations', async () => {
    const prompts: string[] = [];

    mockFetch(async (_url, init) => {
      if (init?.body) {
        const body = JSON.parse(init.body as string);
        prompts.push(body.prompt);
      }
      return new Response(JSON.stringify(makeOptimizeResponse('optimized')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const skill = registerSkill({ apiKey: 'fk_test_isolation_key_12345' });

    skill.contextEngine.ingest('first prompt');
    await skill.contextEngine.assemble();

    skill.contextEngine.ingest('second prompt');
    await skill.contextEngine.assemble();

    // Each call should get its own prompt, not accumulated
    expect(prompts).toEqual(['first prompt', 'second prompt']);
  });

  it('should handle concurrent optimizations via Promise.all', async () => {
    mockFetch(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify(makeOptimizeResponse(`optimized: ${body.prompt}`)),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const skill = registerSkill({ apiKey: 'fk_test_concurrent_key_1234' });

    // Use the hook for concurrent calls (context engine is stateful per-ingest)
    const hook = skill.hooks['before-tool-call'];
    const results = await Promise.all([
      hook({ name: 'test', args: { prompt: 'This is the first concurrent prompt that is long enough for optimization' } }),
      hook({ name: 'test', args: { prompt: 'This is the second concurrent prompt that is long enough for optimization' } }),
      hook({ name: 'test', args: { prompt: 'This is the third concurrent prompt that is long enough for optimization' } }),
    ]);

    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect((r.args.prompt as string).startsWith('optimized:')).toBe(true);
    });
  });

  it('should gracefully handle 429 rate limit', async () => {
    mockFetch(async (url) => {
      if (url.includes('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 });
    });

    const skill = registerSkill({
      apiKey: 'fk_test_ratelimit_key_12345',
      gracefulDegradation: true,
    });

    const original = 'my prompt that should survive rate limiting';
    skill.contextEngine.ingest(original);
    const result = await skill.contextEngine.assemble();

    // Should return original due to graceful degradation
    expect(result).toBe(original);
  });

  it('should accumulate optimization stats across turns', async () => {
    let callNum = 0;
    mockFetch(async () => {
      callNum++;
      const resp = callNum === 1
        ? makeOptimizeResponse('v1', 100, 80)
        : makeOptimizeResponse('v2', 150, 100);
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const skill = registerSkill({ apiKey: 'fk_test_stats_key_1234567' });

    // Turn 1
    skill.contextEngine.ingest('prompt 1');
    await skill.contextEngine.assemble();
    skill.contextEngine.afterTurn();

    // Turn 2
    skill.contextEngine.ingest('prompt 2');
    await skill.contextEngine.assemble();
    skill.contextEngine.afterTurn();

    // Access stats via the engine (cast to access getStats)
    const stats = (skill.contextEngine as any).getStats();
    expect(stats.turns).toBe(2);
    expect(stats.totalSaved).toBe(20 + 50);
    expect(stats.totalOriginal).toBe(100 + 150);
  });

  it('should throw when no API key is provided', () => {
    const originalEnv = process.env.FORTRESS_API_KEY;
    delete process.env.FORTRESS_API_KEY;

    expect(() => registerSkill({})).toThrow('API key is required');

    process.env.FORTRESS_API_KEY = originalEnv;
  });

  it('should accept API key from environment variable', () => {
    const originalEnv = process.env.FORTRESS_API_KEY;
    process.env.FORTRESS_API_KEY = 'fk_test_env_key_1234567890';

    const skill = registerSkill();
    expect(skill).toBeDefined();
    expect(skill.contextEngine).toBeDefined();

    process.env.FORTRESS_API_KEY = originalEnv;
  });
});
