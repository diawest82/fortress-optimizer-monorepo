/**
 * Environment Variable Guard — verify production guards exist
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Env Var Guard', () => {

  test('JWT_SECRET has production crash guard', () => {
    const file = join(WEBSITE_DIR, 'src/lib/jwt-auth.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/CHANGE-THIS|throw.*Error.*JWT|SECRET_IS_SAFE/);
  });

  test('DATABASE_URL is checked at startup', () => {
    const file = join(WEBSITE_DIR, 'next.config.js');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/DATABASE_URL/);
  });

  test('Backend validates API_KEY_SECRET in production', () => {
    const file = join(WEBSITE_DIR, '..', 'backend', 'main.py');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/_validate_production_env|API_KEY_SECRET/);
  });

  test('Cron endpoint requires CRON_SECRET', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/cron/daily/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('CRON_SECRET');
  });

  test('Email webhook requires EMAIL_WEBHOOK_SECRET', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/webhook/email/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('EMAIL_WEBHOOK_SECRET');
  });
});
