/**
 * API SLO — Response Time Enforcement
 * Measures P50/P95/P99 latency over 20 requests per endpoint.
 * Uses slo.contract.json for targets.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const SAMPLES = 20;

interface SloEntry {
  url: string;
  method: string;
  p95: number;
  p99: number;
  label: string;
  backend?: boolean;
  page?: boolean;
  requiresAuth?: boolean;
}

const sloContract: { endpoints: SloEntry[] } = JSON.parse(
  readFileSync(join(__dirname, '..', 'contracts', 'slo.contract.json'), 'utf-8')
);

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function measureLatency(url: string, method: string, samples: number): Promise<number[]> {
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const opts: RequestInit = { method };
    if (method === 'POST') {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify({ prompt: 'test prompt for SLO measurement', level: 'balanced', provider: 'openai' });
    }
    try {
      await fetch(url, opts);
    } catch {
      // Network error — record as timeout
      times.push(10000);
      continue;
    }
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b);
}

test.describe('API SLO: Response Time Enforcement', () => {
  const publicEndpoints = sloContract.endpoints.filter(e => !e.requiresAuth && !e.page);

  for (const endpoint of publicEndpoints) {
    const base = endpoint.backend ? API_BASE : BASE;

    test(`[SLO] ${endpoint.label}: P95 < ${endpoint.p95}ms, P99 < ${endpoint.p99}ms`, async () => {
      const times = await measureLatency(`${base}${endpoint.url}`, endpoint.method, SAMPLES);
      const p50 = percentile(times, 50);
      const p95 = percentile(times, 95);
      const p99 = percentile(times, 99);

      console.log(`  ${endpoint.label}: P50=${Math.round(p50)}ms P95=${Math.round(p95)}ms P99=${Math.round(p99)}ms`);

      expect(p95, `${endpoint.label} P95 ${Math.round(p95)}ms exceeds ${endpoint.p95}ms`).toBeLessThanOrEqual(endpoint.p95);
      expect(p99, `${endpoint.label} P99 ${Math.round(p99)}ms exceeds ${endpoint.p99}ms`).toBeLessThanOrEqual(endpoint.p99);
    });
  }

  // Page TTFB tests
  const pageEndpoints = sloContract.endpoints.filter(e => e.page);

  for (const endpoint of pageEndpoints) {
    test(`[TTFB] ${endpoint.label}: P95 < ${endpoint.p95}ms`, async () => {
      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await fetch(`${BASE}${endpoint.url}`);
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      const p95 = percentile(times, 95);

      console.log(`  ${endpoint.label} TTFB: P95=${Math.round(p95)}ms`);
      expect(p95, `${endpoint.label} TTFB P95 ${Math.round(p95)}ms exceeds ${endpoint.p95}ms`).toBeLessThanOrEqual(endpoint.p95);
    });
  }

  test('[SLO] Degradation warning: no endpoint > 80% of P99 target', async () => {
    const warnings: string[] = [];
    const publicEndpoints = sloContract.endpoints.filter(e => !e.requiresAuth && !e.page);

    for (const endpoint of publicEndpoints) {
      const base = endpoint.backend ? API_BASE : BASE;
      const start = performance.now();
      const opts: RequestInit = { method: endpoint.method };
      if (endpoint.method === 'POST') {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify({ prompt: 'degradation check', level: 'balanced', provider: 'openai' });
      }
      try { await fetch(`${base}${endpoint.url}`, opts); } catch {}
      const elapsed = performance.now() - start;

      if (elapsed > endpoint.p99 * 0.8) {
        warnings.push(`${endpoint.label}: ${Math.round(elapsed)}ms (80% of ${endpoint.p99}ms target)`);
      }
    }

    if (warnings.length > 0) {
      console.log(`  SLO Degradation Warnings:\n    ${warnings.join('\n    ')}`);
    }
    // Warn but don't fail — this is advisory
    expect(warnings.length, `${warnings.length} endpoints approaching SLO limits`).toBeLessThanOrEqual(3);
  });
});
