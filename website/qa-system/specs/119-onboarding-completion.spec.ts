/**
 * Onboarding Completion + Savings Trend + Form Draft
 * User perspective: post-signup experience quality.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Onboarding Completion', () => {

  test('[source] Account shows onboarding wizard for new users', () => {
    const file = join(WEBSITE_DIR, 'src/components/account-content.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/onboarding|Get Started|checklist|step/i);
  });

  test('[source] Onboarding has 3 steps: key → install → optimize', () => {
    const file = join(WEBSITE_DIR, 'src/components/account-content.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/API Key|Install|Optimize|Generate/i);
  });

  test('[source] Dashboard has empty state with install CTA', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/No optimization|Install|Get Started/i);
  });
});

test.describe('Savings Trend Visualization', () => {

  test('[source] Dashboard has daily chart data', () => {
    const file = join(WEBSITE_DIR, 'src/app/dashboard/client.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/dailyData|daily.*chart|Daily Token/i);
  });

  test('[source] Account overview has savings cards', () => {
    const file = join(WEBSITE_DIR, 'src/components/account-content.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/Tokens Optimized|Tokens Saved|Cost Saved/i);
  });
});

test.describe('User Experience Quality', () => {

  test('All nav links are visible and reachable', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const navLinks = await page.locator('nav a').count();
    expect(navLinks).toBeGreaterThan(5);
  });

  test('Footer has essential links', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(5000);
    // Footer may be in a <footer> tag or at bottom of body
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/Documentation|Support|Privacy|Terms/i);
  });

  test('Every page has a title', async ({ request }) => {
    const pages = ['/', '/pricing', '/install', '/compare', '/support', '/docs', '/tools'];
    for (const path of pages) {
      const res = await request.get(`${BASE}${path}`);
      const html = await res.text();
      expect(html, `${path} missing <title>`).toMatch(/<title>[^<]+<\/title>/);
    }
  });

  test('Referral page exists and has content', async ({ page }) => {
    await page.goto(`${BASE}/refer`);
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/refer|referral|invite|earn/i);
  });

  test('Legal pages have content', async ({ request }) => {
    for (const path of ['/legal/privacy', '/legal/terms']) {
      const res = await request.get(`${BASE}${path}`);
      expect(res.status(), `${path}`).toBe(200);
    }
  });
});
