/**
 * Phase 4: ContextEngine Unit Tests
 * Validates the FortressContextEngine adapter
 */

import { FortressContextEngine } from '../src/context-engine';
import { FortressClient } from '../src/client';
import { FortressError, ResolvedFortressConfig, OptimizationMetadata } from '../src/types';

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
function makeConfig(overrides: Partial<ResolvedFortressConfig> = {}): ResolvedFortressConfig {
  return {
    apiKey: 'fk_test_context_key_12345678',
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
    request_id: 'opt_test_ctx',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('FortressContextEngine', () => {
  describe('assemble()', () => {
    it('should call /api/optimize and return optimized text', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify(makeOptimizeResponse('compressed output')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      engine.ingest('this is a long prompt that needs optimization for token savings');
      const result = await engine.assemble();

      expect(result).toBe('compressed output');
    });

    it('should return original text on API failure when graceful=true', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      });

      const config = makeConfig({ gracefulDegradation: true });
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      const original = 'my original prompt text';
      engine.ingest(original);
      const result = await engine.assemble();

      expect(result).toBe(original);
    });

    it('should throw on API failure when graceful=false', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      });

      const config = makeConfig({ gracefulDegradation: false });
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      engine.ingest('some prompt');
      await expect(engine.assemble()).rejects.toThrow(FortressError);
    });

    it('should return empty string when no content ingested', async () => {
      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      const result = await engine.assemble();
      expect(result).toBe('');
    });

    it('should invoke onOptimization callback with metadata', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify(makeOptimizeResponse('shorter', 200, 140)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const onOptimization = jest.fn();
      const config = makeConfig({ onOptimization });
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      engine.ingest('a verbose prompt');
      await engine.assemble();

      expect(onOptimization).toHaveBeenCalledTimes(1);
      const meta: OptimizationMetadata = onOptimization.mock.calls[0][0];
      expect(meta.originalTokens).toBe(200);
      expect(meta.optimizedTokens).toBe(140);
      expect(meta.savings).toBe(60);
      expect(meta.technique).toBe('compression');
      expect(typeof meta.durationMs).toBe('number');
    });
  });

  describe('compact()', () => {
    it('should be a no-op (no local optimization logic)', async () => {
      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      // Should resolve without error or side effects
      await expect(engine.compact()).resolves.toBeUndefined();
    });
  });

  describe('bootstrap()', () => {
    it('should succeed when API is healthy', async () => {
      mockFetch(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      await expect(engine.bootstrap()).resolves.toBeUndefined();
    });

    it('should warn but not throw when API is unreachable', async () => {
      mockFetch(async () => { throw new TypeError('Failed to fetch'); });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      await expect(engine.bootstrap()).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unreachable')
      );

      warnSpy.mockRestore();
    });
  });

  describe('afterTurn()', () => {
    it('should accumulate optimization stats across turns', async () => {
      let callCount = 0;
      mockFetch(async () => {
        callCount++;
        const resp = callCount === 1
          ? makeOptimizeResponse('v1', 100, 70)
          : makeOptimizeResponse('v2', 200, 150);
        return new Response(JSON.stringify(resp), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      // Turn 1
      engine.ingest('first prompt');
      await engine.assemble();
      engine.afterTurn();

      // Turn 2
      engine.ingest('second prompt');
      await engine.assemble();
      engine.afterTurn();

      const stats = engine.getStats();
      expect(stats.turns).toBe(2);
      expect(stats.totalSaved).toBe(30 + 50); // 30 from turn1, 50 from turn2
      expect(stats.totalOriginal).toBe(100 + 200);
    });
  });

  describe('dispose()', () => {
    it('should be a clean no-op', () => {
      const config = makeConfig();
      const client = new FortressClient(config);
      const engine = new FortressContextEngine(client, config);

      expect(() => engine.dispose()).not.toThrow();
    });
  });
});
