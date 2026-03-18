/**
 * Visual Regression Agent — Screenshot Baseline Comparison
 *
 * Captures screenshots of critical pages and compares against baselines.
 * First run creates baselines; subsequent runs diff against them.
 *
 * Run: npx playwright test --project=qa-visual
 * Update baselines: npx playwright test --project=qa-visual --update-snapshots
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const CRITICAL_PAGES = [
  { path: '/', name: 'homepage' },
  { path: '/pricing', name: 'pricing' },
  { path: '/install', name: 'install' },
  { path: '/auth/login', name: 'login' },
  { path: '/auth/signup', name: 'signup' },
  { path: '/support', name: 'support' },
  { path: '/docs', name: 'docs' },
  { path: '/compare', name: 'compare' },
];

test.describe('Visual Agent: Desktop Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const page_info of CRITICAL_PAGES) {
    test(`[desktop] ${page_info.name} matches baseline`, async ({ page }) => {
      await page.goto(`${BASE}${page_info.path}`);
      await page.waitForTimeout(3000);

      // Dismiss cookie banner
      const cookieBtn = page.locator('button:has-text("Accept All")');
      if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveScreenshot(`${page_info.name}-desktop.png`, {
        maxDiffPixelRatio: 0.05,
        fullPage: false,
      });
    });
  }
});

test.describe('Visual Agent: Mobile Screenshots', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const page_info of CRITICAL_PAGES) {
    test(`[mobile] ${page_info.name} matches baseline`, async ({ page }) => {
      await page.goto(`${BASE}${page_info.path}`);
      await page.waitForTimeout(3000);

      const cookieBtn = page.locator('button:has-text("Accept All")');
      if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveScreenshot(`${page_info.name}-mobile.png`, {
        maxDiffPixelRatio: 0.05,
        fullPage: false,
      });
    });
  }
});
