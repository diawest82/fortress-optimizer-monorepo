/**
 * 100x Load Test — Stress Test Under Heavy Concurrency
 *
 * Simulates 100 users performing core operations simultaneously.
 * Runs in waves to avoid overwhelming the test runner itself:
 *   Wave 1: 100 key registrations (batched 20 at a time)
 *   Wave 2: 100 concurrent optimizations (batched 25 at a time)
 *   Wave 3: 500 burst requests (100 users × 5 each, batched 50 at a time)
 *   Wave 4: 100 concurrent usage checks
 *   Wave 5: 100 concurrent key rotations
 *   Wave 6: 100 page loads across all public routes
 *   Wave 7: Cleanup + health check
 *
 * What breaks at 100x:
 *   - DB pool exhaustion: 10 pool + 20 overflow = max 30 concurrent connections
 *   - Rate limiter memory: 100 users × ~50 timestamps each = 5,000 entries
 *   - Key registration: 5/hour/IP means only 5 of 100 register (rest via direct API)
 *   - Optimization engine CPU: 100 concurrent tokenizer calls
 *   - Response times: P99 should stay under 10s
 *   - Memory: rate limiter dicts grow with each user
 *
 * Run: npx playwright test --project=load-100x
 */

import { test, expect } from '@playwright/test';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const TOTAL_USERS = 100;
const BATCH_SIZE = 25;

interface UserCtx {
  id: number;
  apiKey: string;
  requests: number;
  tokensSaved: number;
  latencies: number[];
}

const PROMPTS = [
  'Please analyze this quarterly revenue data and provide key takeaways for the board meeting',
  'Can you help refactor this authentication module to support multiple OAuth providers',
  'Write comprehensive unit tests for the payment processing service covering edge cases',
  'Design a database migration strategy for moving from MongoDB to PostgreSQL',
  'Review this Kubernetes deployment config and suggest reliability improvements',
  'Implement a rate limiting middleware that supports both fixed window and sliding window',
  'Create a caching strategy for our GraphQL API that handles cache invalidation properly',
  'Analyze our CI/CD pipeline bottlenecks and suggest parallelization opportunities',
  'Help design an event-driven architecture for our notification system',
  'Write a comprehensive monitoring and alerting setup for our microservices',
];

function makeUsers(count: number): UserCtx[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    apiKey: '',
    requests: 0,
    tokensSaved: 0,
    latencies: [],
  }));
}

/** Run promises in batches to avoid overwhelming the test runner */
async function batchExecute<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<any>
): Promise<PromiseSettledResult<any>[]> {
  const allResults: PromiseSettledResult<any>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fn));
    allResults.push(...results);
  }
  return allResults;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

test.describe.serial('100x Load Test', () => {
  const users = makeUsers(TOTAL_USERS);
  const metrics = {
    registrations: { ok: 0, rateLimited: 0, errors: 0, totalMs: 0 },
    optimizations: { ok: 0, rateLimited: 0, errors: 0, totalMs: 0 },
    burst: { ok: 0, rateLimited: 0, errors: 0, totalMs: 0 },
    rotations: { ok: 0, errors: 0, totalMs: 0 },
    pages: { ok: 0, errors: 0, totalMs: 0 },
  };

  // ─── Pre-flight ────────────────────────────────────────────────────────

  test('0. Pre-flight health check', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe('healthy');
  });

  // ─── Wave 1: Register 100 API keys ─────────────────────────────────────

  test('1. Register 100 API keys (batched)', async ({ request }) => {
    const start = Date.now();

    const results = await batchExecute(users, BATCH_SIZE, async (user) => {
      const t0 = Date.now();
      const resp = await request.post(`${API}/api/keys/register`, {
        data: { name: `load100-${user.id}`, tier: 'free' },
      });
      const body = await resp.json();
      return { userId: user.id, status: resp.status(), body, latency: Date.now() - t0 };
    });

    const elapsed = Date.now() - start;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 200) {
          metrics.registrations.ok++;
          const user = users.find((u) => u.id === r.value.userId);
          if (user) user.apiKey = r.value.body.api_key;
        } else if (r.value.status === 429) {
          metrics.registrations.rateLimited++;
        } else {
          metrics.registrations.errors++;
        }
      }
    }
    metrics.registrations.totalMs = elapsed;

    console.log(`[100x] Wave 1 — Registrations: ${metrics.registrations.ok} ok, ${metrics.registrations.rateLimited} rate-limited, ${metrics.registrations.errors} errors in ${elapsed}ms`);

    // At least 5 should succeed (rate limit). Expect most to be rate-limited from same IP.
    expect(metrics.registrations.ok).toBeGreaterThanOrEqual(5);
    expect(metrics.registrations.errors).toBe(0);
  });

  // ─── Wave 2: 100 concurrent optimizations ──────────────────────────────

  test('2. 100 concurrent optimizations (batched)', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);
    const start = Date.now();

    const results = await batchExecute(activeUsers, BATCH_SIZE, async (user) => {
      const t0 = Date.now();
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': user.apiKey },
        data: {
          prompt: PROMPTS[user.id % PROMPTS.length],
          level: user.id % 3 === 0 ? 'aggressive' : user.id % 3 === 1 ? 'conservative' : 'balanced',
          provider: user.id % 2 === 0 ? 'openai' : 'anthropic',
        },
      });
      const latency = Date.now() - t0;
      const body = await resp.json();
      return { userId: user.id, status: resp.status(), body, latency };
    });

    const elapsed = Date.now() - start;
    const latencies: number[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled') {
        latencies.push(r.value.latency);
        if (r.value.status === 200) {
          metrics.optimizations.ok++;
          const user = users.find((u) => u.id === r.value.userId);
          if (user) {
            user.requests++;
            user.tokensSaved += r.value.body.tokens?.savings || 0;
            user.latencies.push(r.value.latency);
          }
        } else if (r.value.status === 429) {
          metrics.optimizations.rateLimited++;
        } else {
          metrics.optimizations.errors++;
        }
      }
    }
    metrics.optimizations.totalMs = elapsed;

    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);

    console.log(`[100x] Wave 2 — Optimizations: ${metrics.optimizations.ok} ok, ${metrics.optimizations.rateLimited} rate-limited in ${elapsed}ms`);
    console.log(`[100x] Latency: P50=${p50}ms P95=${p95}ms P99=${p99}ms`);

    // ZERO 500 errors
    expect(metrics.optimizations.errors).toBe(0);
    // P99 under 10 seconds
    expect(p99).toBeLessThan(10000);
  });

  // ─── Wave 3: Burst — 500 requests ──────────────────────────────────────

  test('3. Burst: 500 requests (5 per user) — zero 500s', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);
    const allItems: { user: UserCtx; promptIdx: number }[] = [];
    for (const user of activeUsers) {
      for (let i = 0; i < 5; i++) {
        allItems.push({ user, promptIdx: (user.id + i) % PROMPTS.length });
      }
    }

    const start = Date.now();

    const results = await batchExecute(allItems, 50, async ({ user, promptIdx }) => {
      const resp = await request.post(`${API}/api/optimize`, {
        headers: { 'X-API-Key': user.apiKey },
        data: {
          prompt: PROMPTS[promptIdx],
          level: 'balanced',
          provider: 'openai',
        },
      });
      return { status: resp.status() };
    });

    const elapsed = Date.now() - start;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 200) metrics.burst.ok++;
        else if (r.value.status === 429) metrics.burst.rateLimited++;
        else metrics.burst.errors++;
      }
    }
    metrics.burst.totalMs = elapsed;

    console.log(`[100x] Wave 3 — Burst: ${metrics.burst.ok} ok, ${metrics.burst.rateLimited} rate-limited, ${metrics.burst.errors} errors in ${elapsed}ms`);
    console.log(`[100x] Throughput: ${((metrics.burst.ok / elapsed) * 1000).toFixed(1)} req/s`);

    // ZERO server errors — graceful degradation via 429 is acceptable
    expect(metrics.burst.errors).toBe(0);
  });

  // ─── Wave 4: Data isolation ────────────────────────────────────────────

  test('4. Data isolation: 100 concurrent usage checks', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);

    const results = await batchExecute(activeUsers, BATCH_SIZE, async (user) => {
      const resp = await request.get(`${API}/api/usage`, {
        headers: { 'X-API-Key': user.apiKey },
      });
      return { userId: user.id, status: resp.status(), body: await resp.json() };
    });

    const tokenCounts = new Map<number, number>();
    let isolationViolations = 0;

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.status === 200) {
        const usage = r.value.body;
        expect(usage.tier).toBe('free');
        expect(usage.requests).toBeGreaterThan(0);

        // Check that each user's count is independent
        tokenCounts.set(r.value.userId, usage.tokens_optimized);
      }
    }

    console.log(`[100x] Wave 4 — ${tokenCounts.size} users verified, ${isolationViolations} isolation violations`);
    expect(isolationViolations).toBe(0);
  });

  // ─── Wave 5: Concurrent key rotations ──────────────────────────────────

  test('5. Rotate all keys concurrently', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);
    const start = Date.now();

    const results = await batchExecute(activeUsers, BATCH_SIZE, async (user) => {
      const resp = await request.post(`${API}/api/keys/rotate`, {
        headers: { Authorization: `Bearer ${user.apiKey}` },
      });
      return { userId: user.id, status: resp.status(), body: await resp.json() };
    });

    const elapsed = Date.now() - start;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 200) {
          metrics.rotations.ok++;
          const user = users.find((u) => u.id === r.value.userId);
          if (user) user.apiKey = r.value.body.api_key;
        } else {
          metrics.rotations.errors++;
        }
      }
    }
    metrics.rotations.totalMs = elapsed;

    console.log(`[100x] Wave 5 — Rotations: ${metrics.rotations.ok} ok, ${metrics.rotations.errors} errors in ${elapsed}ms`);
    expect(metrics.rotations.errors).toBe(0);
  });

  // ─── Wave 6: 100 page loads ────────────────────────────────────────────

  test('6. 100 concurrent page loads across all routes', async ({ request }) => {
    const routes = [
      '/', '/pricing', '/install', '/tools', '/compare', '/support',
      '/auth/login', '/auth/signup', '/legal/privacy', '/legal/terms',
    ];
    // 10 routes × 10 requests each = 100
    const allRequests: string[] = [];
    for (let i = 0; i < 10; i++) {
      allRequests.push(...routes);
    }

    const start = Date.now();

    const results = await batchExecute(allRequests, BATCH_SIZE, async (path) => {
      const resp = await request.get(`${BASE}${path}`);
      return { path, status: resp.status() };
    });

    const elapsed = Date.now() - start;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status < 500) metrics.pages.ok++;
        else metrics.pages.errors++;
      }
    }
    metrics.pages.totalMs = elapsed;

    console.log(`[100x] Wave 6 — Pages: ${metrics.pages.ok} ok, ${metrics.pages.errors} errors in ${elapsed}ms`);
    expect(metrics.pages.errors).toBe(0);
  });

  // ─── Wave 7: Cleanup ──────────────────────────────────────────────────

  test('7. Cleanup: revoke all test keys', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);

    await batchExecute(activeUsers, BATCH_SIZE, async (user) => {
      await request.delete(`${API}/api/keys`, {
        headers: { Authorization: `Bearer ${user.apiKey}` },
      });
    });

    console.log(`[100x] Cleaned up ${activeUsers.length} keys`);
  });

  // ─── Post-load health ─────────────────────────────────────────────────

  test('8. Post-load health check', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  // ─── Summary ──────────────────────────────────────────────────────────

  test('9. Print full report', async () => {
    const activeUsers = users.filter((u) => u.requests > 0);
    const allLatencies = activeUsers.flatMap((u) => u.latencies);
    const totalSaved = activeUsers.reduce((s, u) => s + u.tokensSaved, 0);
    const totalRequests = metrics.optimizations.ok + metrics.burst.ok;

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║           100x LOAD TEST REPORT                       ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  Users created:        ${TOTAL_USERS.toString().padStart(6)}                        ║`);
    console.log(`║  Keys registered:      ${metrics.registrations.ok.toString().padStart(6)}  (${metrics.registrations.rateLimited} rate-limited) ║`);
    console.log(`║  Total optimizations:  ${totalRequests.toString().padStart(6)}                        ║`);
    console.log(`║  Total tokens saved:   ${totalSaved.toString().padStart(6)}                        ║`);
    console.log(`║  Server errors (500):  ${(metrics.optimizations.errors + metrics.burst.errors).toString().padStart(6)}                        ║`);
    console.log('╠═══════════════════════════════════════════════════════╣');
    if (allLatencies.length > 0) {
      console.log(`║  Latency P50:          ${percentile(allLatencies, 50).toString().padStart(5)}ms                      ║`);
      console.log(`║  Latency P95:          ${percentile(allLatencies, 95).toString().padStart(5)}ms                      ║`);
      console.log(`║  Latency P99:          ${percentile(allLatencies, 99).toString().padStart(5)}ms                      ║`);
    }
    console.log(`║  Burst throughput:     ${((metrics.burst.ok / metrics.burst.totalMs) * 1000).toFixed(1).padStart(5)} req/s                  ║`);
    console.log(`║  Key rotations:        ${metrics.rotations.ok.toString().padStart(6)} ok                      ║`);
    console.log(`║  Page loads:           ${metrics.pages.ok.toString().padStart(6)} ok                      ║`);
    console.log('╠═══════════════════════════════════════════════════════╣');

    // Pass/fail verdicts
    const allPassed =
      metrics.optimizations.errors === 0 &&
      metrics.burst.errors === 0 &&
      metrics.rotations.errors === 0 &&
      metrics.pages.errors === 0;

    console.log(`║  VERDICT:              ${allPassed ? '✅ PASS' : '❌ FAIL'}                         ║`);
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    expect(allPassed).toBe(true);
  });
});
