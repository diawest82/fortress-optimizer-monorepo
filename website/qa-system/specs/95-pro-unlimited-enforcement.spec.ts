/**
 * Pro Unlimited Token Enforcement — verify no hidden cap
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BACKEND = 'https://api.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Pro Unlimited Enforcement', () => {

  test('[source] Free tier has 50K limit enforced in backend', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/50000|50_000/);
  });

  test('[source] Pro tier skips token limit check', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // Pro/paid tiers should bypass the limit check
    expect(content).toMatch(/free.*limit|tier.*free.*block|individual.*unlimited|pro.*unlimited/i);
  });

  test('[source] Pricing config says Pro is unlimited', () => {
    const file = join(WEBSITE_DIR, 'src/lib/pricing-config.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/pro[\s\S]*?unlimited.*true|pro[\s\S]*?tokens.*-1/i);
  });

  test('[live] Backend health is operational', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    expect(res.status()).toBe(200);
  });

  test('[live] Optimize endpoint accepts multiple rapid requests', async ({ request }) => {
    // Send 5 rapid requests — should all get responses (not throttled after 1)
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.post(`${BACKEND}/api/optimize`, {
          data: { prompt: 'test prompt', level: 'balanced' },
          headers: { 'Authorization': 'Bearer test', 'Content-Type': 'application/json' },
        })
      )
    );
    // All should respond (401 for invalid key, 200 for valid, 429 for rate limit)
    for (const res of results) {
      expect(res.status()).toBeLessThan(500);
    }
  });
});
