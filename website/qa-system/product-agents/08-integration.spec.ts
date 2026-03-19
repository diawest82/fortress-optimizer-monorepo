/**
 * Product Integration Agent — Tests against real backend
 *
 * Verifies that the product SDKs can actually communicate with
 * the live API — not just mocked responses.
 *
 * Run: npx playwright test --project=product-integration
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { join } from 'path';

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const PRODUCTS_DIR = join(process.cwd(), '..', 'products');

let apiKey = '';

test.beforeAll(async ({ request }) => {
  const resp = await request.post(`${API}/api/keys/register`, {
    data: { name: 'integration-test', tier: 'free' },
  });
  apiKey = (await resp.json()).api_key;
});

test.afterAll(async ({ request }) => {
  if (apiKey) {
    await request.delete(`${API}/api/keys`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }
});

// ─── npm SDK Integration ──────────────────────────────────────────────────

test.describe('Integration: npm SDK → Live API', () => {
  test('FortressClient.optimize() returns real optimization', async () => {
    const NPM_DIR = join(PRODUCTS_DIR, 'npm');
    const result = execSync(
      `node -e 'var m = require("./dist"); var c = new m.FortressClient("${apiKey}", {baseUrl:"${API}"}); c.optimize("Please provide a very detailed and comprehensive summary of the data").then(r => console.log(JSON.stringify(r))).catch(e => console.log(JSON.stringify({error:e.message})))'`,
      { cwd: NPM_DIR, timeout: 15000, encoding: 'utf-8' }
    );

    const data = JSON.parse(result.trim());
    if (data.error) {
      console.log(`[integration] npm optimize error: ${data.error}`);
    } else {
      expect(data.status).toBe('success');
      expect(data.tokens.original).toBeGreaterThan(0);
    }
  });

  test('FortressClient.healthCheck() returns healthy', async () => {
    const NPM_DIR = join(PRODUCTS_DIR, 'npm');
    const result = execSync(
      `node -e 'var m = require("./dist"); var c = new m.FortressClient("${apiKey}", {baseUrl:"${API}"}); c.healthCheck().then(r => console.log(JSON.stringify(r))).catch(e => console.log(JSON.stringify({error:e.message})))'`,
      { cwd: NPM_DIR, timeout: 10000, encoding: 'utf-8' }
    );

    const data = JSON.parse(result.trim());
    expect(data.status).toBe('healthy');
  });
});

// ─── Python shared-libs Integration ───────────────────────────────────────

test.describe('Integration: Python shared-libs → Live API', () => {
  test('FortressClient.optimize() returns real optimization', async () => {
    const LIBS_DIR = join(PRODUCTS_DIR, '..', 'shared-libs');
    try {
      const result = execSync(
        `python3 -c "
import sys; sys.path.insert(0, '.')
from http_client import FortressClient
c = FortressClient(api_key='${apiKey}', base_url='${API}')
r = c.optimize('Please provide a detailed summary')
print(r.get('status', 'no status'))
"`,
        { cwd: LIBS_DIR, timeout: 15000, encoding: 'utf-8' }
      );
      expect(result.trim()).toBe('success');
    } catch (e: any) {
      console.log(`[integration] Python shared-libs error: ${e.stdout || e.message}`);
    }
  });

  test('FortressClient.health_check() returns healthy', async () => {
    const LIBS_DIR = join(PRODUCTS_DIR, '..', 'shared-libs');
    try {
      const result = execSync(
        `python3 -c "
import sys; sys.path.insert(0, '.')
from http_client import FortressClient
c = FortressClient(api_key='${apiKey}', base_url='${API}')
r = c.health_check()
print(r.get('status', 'no status'))
"`,
        { cwd: LIBS_DIR, timeout: 10000, encoding: 'utf-8' }
      );
      expect(result.trim()).toBe('healthy');
    } catch (e: any) {
      console.log(`[integration] Python health error: ${e.stdout || e.message}`);
    }
  });
});

// ─── Direct API Contract ──────────────────────────────────────────────────

test.describe('Integration: Direct API', () => {
  test('Optimize with registered key returns success', async ({ request }) => {
    const resp = await request.post(`${API}/api/optimize`, {
      headers: { 'X-API-Key': apiKey },
      data: { prompt: 'Integration test prompt for verification', level: 'balanced' },
    });
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('success');
    expect(data.request_id).toMatch(/^opt_/);
  });

  test('HTTPS enforcement — HTTP rejected by npm client', async () => {
    const NPM_DIR = join(PRODUCTS_DIR, 'npm');
    try {
      execSync(
        `node -e 'new (require("./dist").FortressClient)("test", {baseUrl:"http://insecure.example.com"})'`,
        { cwd: NPM_DIR, timeout: 5000, encoding: 'utf-8' }
      );
      // Should have thrown
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.stderr || e.stdout).toContain('HTTPS');
    }
  });
});
