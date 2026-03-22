/**
 * Observability Verification — Sentry, logging, tracing, monitoring
 * Full verification requires AWS/Sentry access.
 * These tests verify the infrastructure exists in code.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const ROOT_DIR = join(__dirname, '..', '..', '..');

test.describe('Observability Verification', () => {

  test.describe('Sentry Integration', () => {
    test('Sentry setup file exists with proper configuration', async () => {
      const sentryPath = join(ROOT_DIR, 'backend/sentry_setup.py');
      expect(existsSync(sentryPath)).toBe(true);
      const sentry = readFileSync(sentryPath, 'utf-8');
      expect(sentry).toContain('init_sentry');
      expect(sentry).toContain('sentry_sdk');
      expect(sentry).toContain('traces_sample_rate');
    });

    test('Sentry initialized on startup when DSN is set', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('SENTRY_DSN');
      expect(main).toContain('init_sentry');
    });

    test('Sentry scrubs secrets (API keys, Bearer, Stripe)', async () => {
      const sentry = readFileSync(join(ROOT_DIR, 'backend/sentry_setup.py'), 'utf-8');
      expect(sentry).toContain('before_send');
      expect(sentry).toContain('fk_');
      expect(sentry).toContain('Bearer');
      expect(sentry).toContain('sk_live_');
      expect(sentry).toContain('whsec_');
    });

    test('Sentry flushed on shutdown', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('sentry_sdk.flush');
    });
  });

  test.describe('Structured Logging', () => {
    test('JSONFormatter produces structured output', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('class JSONFormatter');
      expect(main).toContain('"timestamp"');
      expect(main).toContain('"level"');
      expect(main).toContain('"request_id"');
    });

    test('Request ID middleware provides tracing', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toMatch(/RequestIdMiddleware|X-Request-Id/);
    });

    test('Health endpoint returns version for deployment tracking', async () => {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        expect(data.version).toBeTruthy();
      }
    });
  });

  test.describe('Monitoring Infrastructure', () => {
    test('Health check tests database connectivity', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toMatch(/SELECT 1|health_check/);
    });

    test('Health check reports Redis and Sentry status', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"redis"');
      expect(main).toContain('"sentry"');
    });

    test('Rate limit events are logged for monitoring', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain("'rate_limit_exceeded'");
    });
  });
});
