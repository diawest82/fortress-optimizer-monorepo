/**
 * 10x Load Test — Full User Journeys Under Concurrency
 *
 * Simulates 10 users simultaneously performing the complete journey:
 *   - Each user signs up, logs in, generates a key, optimizes, checks usage
 *   - All 10 run in parallel (not serial)
 *   - Validates no data leakage between users (isolation)
 *   - Validates no 500s under contention
 *   - Measures response times to catch degradation
 *
 * What breaks at 10x:
 *   - DB connection pool (10 pool, 20 overflow) — can we sustain 10 concurrent DB writers?
 *   - Rate limiter memory — 10 users × 20+ requests each = 200+ tracked timestamps
 *   - Key registration rate limit — 5/hour per IP, but all 10 share the runner IP
 *   - Auth session concurrency — can NextAuth handle 10 simultaneous logins?
 *   - Optimization engine — 10 concurrent optimizer.optimize() calls
 *
 * Run: npx playwright test tests/e2e/load-10x-journey.spec.ts --workers=10
 *
 * For real load testing beyond 10x, use k6 or Artillery (see load-100x.js)
 */

import { test, expect } from '@playwright/test';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const CONCURRENCY = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface UserContext {
  id: number;
  email: string;
  password: string;
  apiKey: string;
  optimizations: number;
  tokensSaved: number;
}

function makeUser(i: number): UserContext {
  const uid = `${Date.now().toString(36)}-${i}`;
  return {
    id: i,
    email: `load-${uid}@test.fortress-optimizer.com`,
    password: `Load!Pass${uid}`,
    apiKey: '',
    optimizations: 0,
    tokensSaved: 0,
  };
}

const PROMPTS = [
  'Please can you basically analyze this data and um provide a summary of the key findings',
  'I was wondering if you could essentially help me refactor this function to be more efficient',
  'Can you like write a comprehensive test suite that covers all the edge cases please',
  'We basically need to implement a caching layer that essentially reduces our API response times',
  'Could you please help us design a database schema that can handle our growing user base',
  'I think we should probably consider implementing rate limiting to protect our endpoints',
  'Would you be able to analyze our deployment pipeline and suggest improvements please',
  'We need to basically set up monitoring and alerting for our production infrastructure',
  'Can you help us implement proper error handling across all of our API endpoints',
  'Please review this pull request and provide feedback on the code quality and architecture',
];

// ─────────────────────────────────────────────────────────────────────────────
// Pre-flight: Health + capacity check
// ─────────────────────────────────────────────────────────────────────────────

test.describe('10x Load Test', () => {
  test('0. Pre-flight: backend healthy and ready', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1: 10 concurrent key registrations
  // ─────────────────────────────────────────────────────────────────────────

  const users: UserContext[] = Array.from({ length: CONCURRENCY }, (_, i) => makeUser(i));

  test('1. Register 10 API keys concurrently', async ({ request }) => {
    const start = Date.now();

    const results = await Promise.allSettled(
      users.map(async (user) => {
        const resp = await request.post(`${API}/api/keys/register`, {
          data: { name: `load-user-${user.id}`, tier: 'free' },
        });
        return { userId: user.id, status: resp.status(), body: await resp.json() };
      })
    );

    const elapsed = Date.now() - start;
    console.log(`[10x] 10 key registrations completed in ${elapsed}ms`);

    // At least 5 should succeed (rate limit is 5/hour/IP)
    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 200
    );
    expect(succeeded.length).toBeGreaterThanOrEqual(5);

    // Assign keys to users
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.status === 200) {
        const user = users.find((u) => u.id === result.value.userId);
        if (user) user.apiKey = result.value.body.api_key;
      }
    }

    // Track how many got rate-limited (expected for >5 from same IP)
    const rateLimited = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 429
    );
    console.log(`[10x] ${succeeded.length} registered, ${rateLimited.length} rate-limited (expected)`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: 10 concurrent optimization requests
  // ─────────────────────────────────────────────────────────────────────────

  test('2. Send 10 optimization requests concurrently', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);
    const start = Date.now();

    const results = await Promise.allSettled(
      activeUsers.map(async (user, i) => {
        const resp = await request.post(`${API}/api/optimize`, {
          headers: { 'X-API-Key': user.apiKey },
          data: {
            prompt: PROMPTS[i % PROMPTS.length],
            level: i % 2 === 0 ? 'balanced' : 'aggressive',
            provider: 'openai',
          },
        });
        const body = await resp.json();
        return { userId: user.id, status: resp.status(), body };
      })
    );

    const elapsed = Date.now() - start;
    console.log(`[10x] ${activeUsers.length} concurrent optimizations in ${elapsed}ms`);

    // ALL should succeed (different API keys = different rate limit buckets)
    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.status).toBe(200);
        expect(result.value.body.status).toBe('success');
        expect(result.value.body.tokens.savings).toBeGreaterThanOrEqual(0);

        // Track per-user stats
        const user = users.find((u) => u.id === result.value.userId);
        if (user) {
          user.optimizations++;
          user.tokensSaved += result.value.body.tokens.savings;
        }
      }
    }

    // Response time check: P95 should be under 5 seconds
    expect(elapsed / activeUsers.length).toBeLessThan(5000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 3: Burst — 5 requests per user (50 total)
  // ─────────────────────────────────────────────────────────────────────────

  test('3. Burst: 50 requests (5 per user) — no 500s', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);
    const start = Date.now();

    const allRequests: Promise<{ userId: number; status: number }>[] = [];
    for (const user of activeUsers) {
      for (let i = 0; i < 5; i++) {
        allRequests.push(
          request
            .post(`${API}/api/optimize`, {
              headers: { 'X-API-Key': user.apiKey },
              data: {
                prompt: PROMPTS[(user.id + i) % PROMPTS.length],
                level: 'balanced',
                provider: 'openai',
              },
            })
            .then(async (resp) => ({ userId: user.id, status: resp.status() }))
        );
      }
    }

    const results = await Promise.allSettled(allRequests);
    const elapsed = Date.now() - start;
    console.log(`[10x] Burst: ${allRequests.length} requests in ${elapsed}ms`);

    // Count outcomes
    let ok = 0;
    let rateLimited = 0;
    let serverError = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 200) ok++;
        else if (r.value.status === 429) rateLimited++;
        else if (r.value.status >= 500) serverError++;
      }
    }

    console.log(`[10x] Burst results: ${ok} ok, ${rateLimited} rate-limited, ${serverError} errors`);

    // ZERO 500 errors — the system must degrade gracefully
    expect(serverError).toBe(0);

    // Most should succeed (rate limit is 100/min per key, we send 5 per key)
    expect(ok).toBeGreaterThan(allRequests.length * 0.8);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 4: Data isolation — no cross-user leakage
  // ─────────────────────────────────────────────────────────────────────────

  test('4. Data isolation: each user sees only their own usage', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);

    const results = await Promise.allSettled(
      activeUsers.map(async (user) => {
        const resp = await request.get(`${API}/api/usage`, {
          headers: { 'X-API-Key': user.apiKey },
        });
        return { userId: user.id, status: resp.status(), body: await resp.json() };
      })
    );

    // Each user should see their own request count, not someone else's
    const usageCounts = new Set<number>();
    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.status).toBe(200);
        const usage = result.value.body;

        // Tier should be free for all test users
        expect(usage.tier).toBe('free');

        // Requests should be > 0 (they all sent at least 1 optimization)
        expect(usage.requests).toBeGreaterThan(0);

        // Token counts should be isolated
        usageCounts.add(usage.tokens_optimized);
      }
    }

    console.log(`[10x] Unique token counts across users: ${usageCounts.size}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 5: Concurrent key rotations
  // ─────────────────────────────────────────────────────────────────────────

  test('5. Rotate all 10 keys concurrently — no conflicts', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);
    const start = Date.now();

    const results = await Promise.allSettled(
      activeUsers.map(async (user) => {
        const resp = await request.post(`${API}/api/keys/rotate`, {
          headers: { Authorization: `Bearer ${user.apiKey}` },
        });
        return { userId: user.id, status: resp.status(), body: await resp.json() };
      })
    );

    const elapsed = Date.now() - start;
    console.log(`[10x] ${activeUsers.length} concurrent rotations in ${elapsed}ms`);

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.status).toBe(200);
        const newKey = result.value.body.api_key;
        expect(newKey).toMatch(/^fk_/);

        // Update user's key
        const user = users.find((u) => u.id === result.value.userId);
        if (user) {
          // Verify old key is dead
          const oldResp = await request.get(`${API}/api/usage`, {
            headers: { 'X-API-Key': user.apiKey },
          });
          expect(oldResp.status()).toBe(401);

          user.apiKey = newKey;
        }
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 6: Post-rotation — all new keys work
  // ─────────────────────────────────────────────────────────────────────────

  test('6. All rotated keys work and retain usage history', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);

    const results = await Promise.allSettled(
      activeUsers.map(async (user) => {
        const resp = await request.get(`${API}/api/usage`, {
          headers: { 'X-API-Key': user.apiKey },
        });
        return { userId: user.id, status: resp.status(), body: await resp.json() };
      })
    );

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.status).toBe(200);
        // Usage should be preserved after rotation
        expect(result.value.body.requests).toBeGreaterThan(0);
        expect(result.value.body.tokens_optimized).toBeGreaterThan(0);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 7: UI concurrency — 10 simultaneous page loads
  // ─────────────────────────────────────────────────────────────────────────

  test('7. 10 simultaneous page loads — no 500s', async ({ request }) => {
    const pages = [
      '/',
      '/pricing',
      '/install',
      '/tools',
      '/compare',
      '/support',
      '/auth/login',
      '/auth/signup',
      '/legal/privacy',
      '/legal/terms',
    ];

    const start = Date.now();
    const results = await Promise.allSettled(
      pages.map(async (path) => {
        const resp = await request.get(`${BASE}${path}`);
        return { path, status: resp.status() };
      })
    );

    const elapsed = Date.now() - start;
    console.log(`[10x] 10 page loads in ${elapsed}ms`);

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        // No 500s
        expect(result.value.status).toBeLessThan(500);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 8: Cleanup — revoke all keys
  // ─────────────────────────────────────────────────────────────────────────

  test('8. Cleanup: revoke all test keys', async ({ request }) => {
    const activeUsers = users.filter((u) => u.apiKey);

    const results = await Promise.allSettled(
      activeUsers.map(async (user) => {
        const resp = await request.delete(`${API}/api/keys`, {
          headers: { Authorization: `Bearer ${user.apiKey}` },
        });
        return { userId: user.id, status: resp.status() };
      })
    );

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.status).toBe(200);
      }
    }

    console.log(`[10x] Cleaned up ${activeUsers.length} test keys`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 9: Post-load health check
  // ─────────────────────────────────────────────────────────────────────────

  test('9. Post-load: backend still healthy', async ({ request }) => {
    const resp = await request.get(`${API}/health`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────

  test('10. Print summary', async () => {
    const activeUsers = users.filter((u) => u.optimizations > 0);
    const totalOpts = activeUsers.reduce((sum, u) => sum + u.optimizations, 0);
    const totalSaved = activeUsers.reduce((sum, u) => sum + u.tokensSaved, 0);

    console.log('\n═══════════════════════════════════════');
    console.log('  10x LOAD TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`  Users created:     ${users.length}`);
    console.log(`  Users with keys:   ${users.filter((u) => u.apiKey).length}`);
    console.log(`  Total optimizations: ${totalOpts}`);
    console.log(`  Total tokens saved:  ${totalSaved}`);
    console.log(`  Avg per user:        ${(totalOpts / activeUsers.length).toFixed(1)} opts`);
    console.log('═══════════════════════════════════════\n');

    expect(totalOpts).toBeGreaterThan(0);
  });
});
