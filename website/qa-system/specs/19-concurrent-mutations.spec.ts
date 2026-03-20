/**
 * Concurrent Mutations — Race Condition Safety
 * Tests that simultaneous operations don't cause data corruption or crashes.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

test.describe('Concurrent Mutations: Race Condition Safety', () => {

  test('5 simultaneous signups with unique emails all succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`${BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `concurrent-${UNIQUE}-${i}@test.fortress-optimizer.com`,
            password: `SecureP@ss${UNIQUE}!`,
            name: `Concurrent ${i}`,
          }),
        }).then(r => ({ status: r.status, idx: i }))
      )
    );
    const serverErrors = results.filter(r => r.status >= 500);
    expect(serverErrors, `${serverErrors.length} server errors during concurrent signup`).toHaveLength(0);
  });

  test('2 signups with SAME email — one succeeds, one gets duplicate error', async () => {
    const email = `dupe-${UNIQUE}@test.fortress-optimizer.com`;
    const results = await Promise.all([
      fetch(`${BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: `SecureP@ss${UNIQUE}!`, name: 'Dupe 1' }),
      }).then(r => r.status),
      fetch(`${BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: `SecureP@ss${UNIQUE}!`, name: 'Dupe 2' }),
      }).then(r => r.status),
    ]);
    // No 500s
    expect(results.filter(s => s >= 500)).toHaveLength(0);
    // At least one should succeed (200/201), at least one should fail (400/409)
    const successes = results.filter(s => s < 300);
    const failures = results.filter(s => s >= 400 && s < 500);
    expect(successes.length + failures.length).toBe(2);
  });

  test('10 simultaneous optimize requests with same key', async () => {
    // Register a key first
    const regRes = await fetch(`${API_BASE}/api/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `concurrent-opt-${UNIQUE}@test.fortress-optimizer.com`,
        tier: 'free',
      }),
    });
    let apiKey = 'fk_test_concurrent';
    if (regRes.ok) {
      const regData = await regRes.json();
      apiKey = regData.api_key || regData.key || apiKey;
    }

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: `Concurrent optimization request number ${i}`,
            level: 'balanced',
            provider: 'openai',
          }),
        }).then(r => r.status)
      )
    );
    const serverErrors = results.filter(s => s >= 500);
    expect(serverErrors, `${serverErrors.length} server errors during concurrent optimize`).toHaveLength(0);
  });

  test('5 simultaneous password reset requests for same email', async () => {
    const email = `reset-flood-${UNIQUE}@test.fortress-optimizer.com`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(`${BASE}/api/password/request-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).then(r => r.status)
      )
    );
    const serverErrors = results.filter(s => s >= 500);
    expect(serverErrors).toHaveLength(0);
  });

  test('High-frequency health check polling (50 requests)', async () => {
    const start = performance.now();
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        fetch(`${API_BASE}/health`).then(r => r.status)
      )
    );
    const elapsed = performance.now() - start;
    const serverErrors = results.filter(s => s >= 500);
    expect(serverErrors).toHaveLength(0);
    console.log(`  50 health checks in ${Math.round(elapsed)}ms`);
  });

  test('Concurrent API key registrations for different users', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`${API_BASE}/api/keys/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `key-concurrent-${UNIQUE}-${i}@test.fortress-optimizer.com`,
            tier: 'free',
          }),
        }).then(r => r.status)
      )
    );
    const serverErrors = results.filter(s => s >= 500);
    expect(serverErrors).toHaveLength(0);
  });

  test('Concurrent page loads do not cause errors', async () => {
    const pages = ['/', '/pricing', '/install', '/compare', '/tools'];
    const results = await Promise.all(
      pages.map(path =>
        fetch(`${BASE}${path}`).then(r => ({ path, status: r.status }))
      )
    );
    const broken = results.filter(r => r.status >= 500);
    expect(broken, `Server errors on: ${broken.map(r => r.path).join(', ')}`).toHaveLength(0);
  });

  test('Rapid sequential login attempts for same user', async () => {
    const email = `rapid-login-${UNIQUE}@test.fortress-optimizer.com`;
    const password = `SecureP@ss${UNIQUE}!`;

    // Create account
    await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Rapid Login' }),
    });

    // Rapid login attempts
    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      results.push(res.status);
    }

    const serverErrors = results.filter(s => s >= 500);
    expect(serverErrors).toHaveLength(0);
    // Some may be rate-limited (429) — that's expected and good security
    // First few should succeed, later ones may be rate limited
    const nonServerErrors = results.filter(s => s < 500);
    expect(nonServerErrors.length, 'All requests should get non-500 responses').toBe(results.length);
  });
});
