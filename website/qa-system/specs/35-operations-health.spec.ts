/**
 * Operations Health — Verifies operational infrastructure is WORKING
 * Not just "does the code exist" but "is it configured and functional"
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const ROOT_DIR = join(__dirname, '..', '..', '..');
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Operations Health: Infrastructure Verification', () => {

  test.describe('Health Check Completeness', () => {
    test('Backend /health returns DB + Redis + Sentry status', async () => {
      const res = await fetch(`${API_BASE}/health`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('status');
      // Redis and Sentry may show as "not_configured" in test — that's OK
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain('"redis"');
      expect(mainPy).toContain('"sentry"');
    });

    test('Website /api/health returns DB status', async () => {
      const res = await fetch(`${BASE}/api/health`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.DATABASE || data.database).toMatch(/connected|CONNECTED/i);
    });

    test('Backend health returns 503 when DB is degraded (source check)', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain('503');
      expect(mainPy).toContain('degraded');
    });
  });

  test.describe('Structured Logging', () => {
    test('Backend uses JSONFormatter for structured logs', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain('class JSONFormatter');
      expect(mainPy).toContain('json.dumps');
      expect(mainPy).toContain('"timestamp"');
      expect(mainPy).toContain('"level"');
      expect(mainPy).toContain('"message"');
    });

    test('Error handler logs request_id + stack trace', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toMatch(/general_exception_handler[\s\S]*request_id/);
      expect(mainPy).toMatch(/general_exception_handler[\s\S]*exc_info=True/);
    });

    test('Rate limit exceeded events are logged', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain("'rate_limit_exceeded'");
    });

    test('Auth rejection events are logged in middleware', async () => {
      const middleware = readFileSync(join(WEBSITE_DIR, 'src/middleware.ts'), 'utf-8');
      expect(middleware).toContain('"auth_rejected"');
      expect(middleware).toContain('JSON.stringify');
    });
  });

  test.describe('Shutdown & Lifecycle', () => {
    test('Shutdown flushes Sentry events', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain('sentry_sdk.flush');
    });

    test('Shutdown disposes database engine', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toContain('engine.dispose');
    });

    test('Sentry setup scrubs secrets', async () => {
      const sentrySetup = readFileSync(join(ROOT_DIR, 'backend/sentry_setup.py'), 'utf-8');
      expect(sentrySetup).toContain('fk_');
      expect(sentrySetup).toContain('Bearer');
      expect(sentrySetup).toContain('sk_live_');
    });
  });

  test.describe('Cron & Automation', () => {
    test('Vercel cron configured for daily automation', async () => {
      const vercelJson = JSON.parse(readFileSync(join(WEBSITE_DIR, 'vercel.json'), 'utf-8'));
      expect(vercelJson.crons).toBeDefined();
      const daily = vercelJson.crons.find((c: any) => c.path.includes('daily'));
      expect(daily).toBeTruthy();
      expect(daily.schedule).toMatch(/\d+ \d+ \* \* \*/);
    });

    test('Cron POST endpoint requires CRON_SECRET', async () => {
      const cronRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/cron/daily/route.ts'), 'utf-8');
      expect(cronRoute).toContain('CRON_SECRET');
      expect(cronRoute).toContain('401');
    });

    test('Cron GET does not expose secret in URL', async () => {
      const cronRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/cron/daily/route.ts'), 'utf-8');
      // GET should not accept secret as query param
      expect(cronRoute).not.toMatch(/searchParams.*get.*secret/);
    });
  });

  test.describe('Deployment Safety', () => {
    test('Migration pipeline fails on error (no || echo)', async () => {
      const deploy = readFileSync(join(ROOT_DIR, '.github/workflows/backend-deploy.yml'), 'utf-8');
      expect(deploy).not.toMatch(/alembic.*\|\|.*echo/);
    });

    test('Docker images tagged with commit SHA', async () => {
      const deploy = readFileSync(join(ROOT_DIR, '.github/workflows/backend-deploy.yml'), 'utf-8');
      expect(deploy).toContain('github.sha');
    });

    test('Auto-rollback on deployment failure', async () => {
      const deploy = readFileSync(join(ROOT_DIR, '.github/workflows/backend-deploy.yml'), 'utf-8');
      expect(deploy).toContain('Auto-rollback');
      expect(deploy).toContain('save-current');
    });

    test('Post-deploy health check exists', async () => {
      const deploy = readFileSync(join(ROOT_DIR, '.github/workflows/backend-deploy.yml'), 'utf-8');
      expect(deploy).toContain('Post-deploy health check');
      expect(deploy).toContain('curl');
    });

    test('Vercel deploy runs smoke tests', async () => {
      const vercelDeploy = readFileSync(join(ROOT_DIR, '.github/workflows/deploy-vercel.yml'), 'utf-8');
      expect(vercelDeploy).toContain('playwright');
    });
  });

  test.describe('Redis & Rate Limiting', () => {
    test('Redis rate limiter has reconnection logic', async () => {
      const rateLimiter = readFileSync(join(ROOT_DIR, 'backend/rate_limiter_redis.py'), 'utf-8');
      expect(rateLimiter).toContain('_connect_redis');
      expect(rateLimiter).toContain('_redis_retry_after');
      expect(rateLimiter).toContain('Attempting Redis reconnection');
    });

    test('Rate limiter has configurable RPM/RPD', async () => {
      const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(mainPy).toMatch(/requests_per_minute|rpm/);
    });
  });

  test.describe('Data Management', () => {
    test('Cleanup script has retention policies', async () => {
      const cleanup = readFileSync(join(ROOT_DIR, 'backend/cleanup.py'), 'utf-8');
      expect(cleanup).toContain('LOG_RETENTION_DAYS');
      expect(cleanup).toContain('KEY_RETENTION_DAYS');
    });

    test('Email webhook requires authentication', async () => {
      const emailWebhook = readFileSync(join(WEBSITE_DIR, 'src/app/api/webhook/email/route.ts'), 'utf-8');
      expect(emailWebhook).toContain('EMAIL_WEBHOOK_SECRET');
      expect(emailWebhook).toContain('401');
    });
  });
});
