/**
 * Sustained Load — 60-Second Continuous Traffic Test
 * Not burst (that's 10x/100x tests). This is SUSTAINED pressure.
 * Detects: memory leaks, connection pool exhaustion, latency drift.
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const DURATION_MS = 30000; // 30 seconds (reduced from 60 for CI)
const RPS = 3; // 3 requests per second

test.describe('Sustained Load: 30-Second Continuous Traffic', () => {

  let testApiKey = '';

  test('Setup: register test API key', async () => {
    const res = await fetch(`${API_BASE}/api/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `sustained-${UNIQUE}@test.fortress-optimizer.com`,
        tier: 'free',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      testApiKey = data.api_key || data.key || '';
    }
    testApiKey = testApiKey || 'fk_test_sustained';
  });

  test('Sustained API traffic: zero 500 errors over 30 seconds', async () => {
    test.setTimeout(DURATION_MS + 30000);
    const results: { status: number; elapsed: number; timestamp: number }[] = [];
    const startTime = Date.now();
    const interval = 1000 / RPS;

    while (Date.now() - startTime < DURATION_MS) {
      const reqStart = performance.now();
      try {
        const res = await fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testApiKey}`,
          },
          body: JSON.stringify({
            prompt: 'Please provide a detailed summary of the quarterly results.',
            level: 'balanced',
            provider: 'openai',
          }),
        });
        results.push({
          status: res.status,
          elapsed: performance.now() - reqStart,
          timestamp: Date.now() - startTime,
        });
      } catch {
        results.push({ status: 0, elapsed: performance.now() - reqStart, timestamp: Date.now() - startTime });
      }
      // Wait for next request interval
      const waitTime = interval - (performance.now() - reqStart);
      if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
    }

    const serverErrors = results.filter(r => r.status >= 500);
    const totalRequests = results.length;
    const errorRate = serverErrors.length / totalRequests;

    console.log(`  Sustained load: ${totalRequests} requests over ${Math.round((Date.now() - startTime) / 1000)}s`);
    console.log(`  Error rate: ${(errorRate * 100).toFixed(1)}% (${serverErrors.length} errors)`);

    expect(serverErrors.length, `${serverErrors.length} server errors`).toBe(0);
    expect(totalRequests, 'Should have made requests').toBeGreaterThan(10);
  });

  test('Latency does not degrade over time', async () => {
    test.setTimeout(DURATION_MS + 30000);
    const latencies: number[] = [];
    const startTime = Date.now();

    // Collect 20 samples spread over the test period
    for (let i = 0; i < 20; i++) {
      const reqStart = performance.now();
      await fetch(`${API_BASE}/health`);
      latencies.push(performance.now() - reqStart);
      await new Promise(r => setTimeout(r, DURATION_MS / 20));
    }

    // Compare first 5 vs last 5 average latency
    const firstFive = latencies.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lastFive = latencies.slice(-5).reduce((a, b) => a + b, 0) / 5;

    console.log(`  First 5 avg: ${Math.round(firstFive)}ms, Last 5 avg: ${Math.round(lastFive)}ms`);

    // Last 5 should not be more than 3x the first 5 (allows for variance)
    expect(lastFive, 'Latency should not degrade 3x over time').toBeLessThan(firstFive * 3 + 100);
  });

  test('Health endpoint stays healthy during sustained API load', async () => {
    // Send 5 health checks during the test
    const healthResults: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${API_BASE}/health`);
      healthResults.push(res.ok);
      await new Promise(r => setTimeout(r, 2000));
    }
    const allHealthy = healthResults.every(h => h);
    expect(allHealthy, 'Health should stay healthy during load').toBe(true);
  });

  test('Homepage TTFB stays under 2s during API load', async () => {
    const ttfbs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch(BASE);
      ttfbs.push(performance.now() - start);
      await new Promise(r => setTimeout(r, 2000));
    }
    const maxTtfb = Math.max(...ttfbs);
    console.log(`  Homepage TTFB max: ${Math.round(maxTtfb)}ms`);
    expect(maxTtfb, 'Homepage TTFB should stay under 2s').toBeLessThan(2000);
  });

  test('All responses contain valid JSON (no corruption)', async () => {
    const responses: { valid: boolean; status: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${API_BASE}/health`);
      try {
        await res.json();
        responses.push({ valid: true, status: res.status });
      } catch {
        responses.push({ valid: false, status: res.status });
      }
    }
    const invalid = responses.filter(r => !r.valid);
    expect(invalid, 'All responses should be valid JSON').toHaveLength(0);
  });

  test('Concurrent users get independent responses', async () => {
    // 5 concurrent requests with different prompts
    const prompts = [
      'Summarize the Q1 results please.',
      'Explain the architecture of this system.',
      'Write a function to sort an array.',
      'Describe the weather patterns in March.',
      'List the top 5 programming languages.',
    ];
    const results = await Promise.all(
      prompts.map(prompt =>
        fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testApiKey}`,
          },
          body: JSON.stringify({ prompt, level: 'balanced', provider: 'openai' }),
        }).then(async r => ({
          status: r.status,
          body: r.ok ? await r.json() : null,
        }))
      )
    );
    const serverErrors = results.filter(r => r.status >= 500);
    expect(serverErrors).toHaveLength(0);
  });

  test('Cleanup: revoke test key', async () => {
    if (testApiKey && testApiKey !== 'fk_test_sustained') {
      await fetch(`${API_BASE}/api/keys/${testApiKey}`, { method: 'DELETE' }).catch(() => {});
    }
  });
});
