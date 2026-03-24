/**
 * Auth Pattern Guard — CI gate that catches unprotected API routes
 * Greps every API route for missing auth. Prevents regression.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');
const API_DIR = join(WEBSITE_DIR, 'src/app/api');

test.describe('Auth Pattern Guard', () => {

  test('No API route uses x-user-context header (removed vulnerability)', () => {
    const result = execSync(
      `grep -rn "x-user-context" ${API_DIR} --include="*.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const lines = result ? result.split('\n').filter(l => !l.includes('.spec.ts') && !l.includes('//')) : [];
    expect(lines, `x-user-context found in:\n${lines.join('\n')}`).toHaveLength(0);
  });

  test('No API route returns token in response body', () => {
    const result = execSync(
      `grep -rn "token.*response\\|response.*token" ${API_DIR} --include="*.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const lines = result ? result.split('\n').filter(l =>
      !l.includes('.spec.ts') && !l.includes('//') && !l.includes('csrf') &&
      !l.includes('CRON_SECRET') && !l.includes('webhook') && !l.includes('stripe')
    ) : [];
    // Filter to only actual token-in-body patterns
    const suspicious = lines.filter(l => l.match(/json.*\{.*token|token:.*response/i));
    expect(suspicious, `Token possibly returned in body:\n${suspicious.join('\n')}`).toHaveLength(0);
  });

  test('Protected API routes use auth verification', () => {
    const { readFileSync, existsSync } = require('fs');
    const protectedDirs = ['dashboard', 'support', 'users', 'api-keys', 'subscriptions'];
    const missing: string[] = [];

    for (const dir of protectedDirs) {
      const dirPath = join(API_DIR, dir);
      try {
        const result = execSync(
          `find "${dirPath}" -name "route.ts" -exec grep -l "verifyAuthToken\\|getServerSession\\|cookies\\|session\\|auth" {} \\; 2>/dev/null || true`,
          { encoding: 'utf-8' }
        ).trim();
        if (!result) {
          missing.push(dir);
        }
      } catch {
        // Directory may not exist — skip
      }
    }
    expect(missing, `Routes missing auth check:\n${missing.join('\n')}`).toHaveLength(0);
  });

  test('No hardcoded secrets in API routes', () => {
    // Check for obvious secret patterns (not env vars)
    const { readFileSync, readdirSync, statSync } = require('fs');

    function findFiles(dir: string, ext: string): string[] {
      const files: string[] = [];
      try {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          try {
            if (statSync(full).isDirectory()) files.push(...findFiles(full, ext));
            else if (full.endsWith(ext)) files.push(full);
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
      return files;
    }

    const tsFiles = findFiles(API_DIR, '.ts');
    const violations: string[] = [];
    for (const f of tsFiles) {
      if (f.includes('.spec.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      if (content.match(/sk_live_[a-zA-Z0-9]{10,}|sk_test_[a-zA-Z0-9]{10,}/)) {
        violations.push(f);
      }
    }
    expect(violations, `Hardcoded Stripe keys in:\n${violations.join('\n')}`).toHaveLength(0);
  });

  test('Webhook routes verify signatures', () => {
    const result = execSync(
      `grep -rn "webhook" ${API_DIR} --include="*.ts" -l 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    const webhookFiles = result ? result.split('\n').filter(Boolean) : [];
    for (const file of webhookFiles) {
      const content = execSync(`cat "${file}"`, { encoding: 'utf-8' });
      expect(content, `${file} missing signature verification`).toMatch(/verify|signature|secret|WEBHOOK_SECRET/i);
    }
  });
});
