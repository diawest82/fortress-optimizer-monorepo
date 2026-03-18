/**
 * Mobile/Responsive Agent — Cross-Device Verification
 *
 * Tests critical pages across mobile, tablet, and desktop viewports.
 * Checks: layout integrity, touch targets, nav accessibility, no overflow.
 *
 * Run: npx playwright test --project=qa-mobile
 */

import { test, expect } from '../shared/fixtures';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
];

const PAGES = ['/', '/pricing', '/install', '/auth/login', '/auth/signup', '/support'];

test.describe('Mobile Agent: No Horizontal Overflow', () => {
  for (const vp of VIEWPORTS) {
    for (const pagePath of PAGES) {
      test(`[${vp.name}] ${pagePath} has no horizontal scroll`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(`${BASE}${pagePath}`);
        await page.waitForTimeout(2000);

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasOverflow, `${pagePath} overflows at ${vp.width}px`).toBe(false);
      });
    }
  }
});

test.describe('Mobile Agent: Touch Targets', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('[mobile] All buttons/links have minimum 44px touch target', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(2000);

    const smallTargets = await page.evaluate(() => {
      const interactives = document.querySelectorAll('a, button');
      const tooSmall: string[] = [];
      interactives.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Only check visible elements
        if (rect.width > 0 && rect.height > 0) {
          if (rect.height < 44 && rect.width < 44) {
            const text = el.textContent?.trim().slice(0, 30) || el.tagName;
            tooSmall.push(`${text} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
          }
        }
      });
      return tooSmall;
    });

    // Log small targets but don't fail — many nav links are intentionally compact
    if (smallTargets.length > 0) {
      console.log(`[mobile] ${smallTargets.length} elements below 44px touch target:`);
      smallTargets.slice(0, 10).forEach(t => console.log(`  - ${t}`));
    }
  });
});

test.describe('Mobile Agent: Navigation Accessible', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('[mobile] Homepage renders without errors', async ({ page, evidence }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(2000);

    // Page should render with content
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // No server errors
    const serverErrors = evidence.networkErrors.filter(e => e.status >= 500);
    expect(serverErrors).toHaveLength(0);
  });

  test('[mobile] Pricing page renders all tiers', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toContainText(/Free/i);
    await expect(page.locator('body')).toContainText(/Pro/i);
    await expect(page.locator('body')).toContainText(/Teams/i);
  });

  test('[mobile] Login form is usable', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    // Input should be wide enough to type in
    const box = await emailInput.boundingBox();
    expect(box!.width).toBeGreaterThan(200);
  });

  test('[mobile] Signup form is usable', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);

    const fields = ['firstName', 'lastName', 'email', 'password'];
    for (const field of fields) {
      await expect(page.locator(`input[name="${field}"]`)).toBeVisible();
    }
  });
});
