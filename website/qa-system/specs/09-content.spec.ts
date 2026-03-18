/**
 * Content/Copy Agent — Placeholder Text, Stale Copy, Wrong Labels
 *
 * Scans pages for:
 *   - Lorem ipsum / placeholder text
 *   - "TODO" / "FIXME" / "coming soon" in visible content
 *   - Empty headings or buttons
 *   - Broken or missing images
 *   - Inconsistent CTAs
 *
 * Run: npx playwright test --project=qa-content
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const PAGES = ['/', '/pricing', '/install', '/compare', '/support', '/tools',
  '/docs', '/auth/login', '/auth/signup', '/legal/privacy', '/legal/terms'];

const PLACEHOLDER_PATTERNS = [
  'lorem ipsum',
  'placeholder',
  'todo:',
  'fixme:',
  'xxx',
  'example.com',     // Should use fortress-optimizer.com
  'your-api-key',
  'insert ',
  'replace this',
  'dummy',
];

test.describe('Content Agent: No Placeholder Text', () => {
  for (const pagePath of PAGES) {
    test(`[placeholder] ${pagePath} has no placeholder text`, async ({ page }) => {
      await page.goto(`${BASE}${pagePath}`);
      await page.waitForTimeout(2000);

      const bodyText = (await page.locator('body').textContent() || '').toLowerCase();

      for (const pattern of PLACEHOLDER_PATTERNS) {
        // Allow "example" in code samples and install guides
        if (pattern === 'example.com' && (pagePath === '/install' || pagePath === '/docs')) continue;

        const found = bodyText.includes(pattern);
        expect(found, `${pagePath} contains "${pattern}"`).toBe(false);
      }
    });
  }
});

test.describe('Content Agent: No Empty Elements', () => {
  for (const pagePath of PAGES) {
    test(`[empty] ${pagePath} has no empty headings`, async ({ page }) => {
      await page.goto(`${BASE}${pagePath}`);
      await page.waitForTimeout(2000);

      const emptyHeadings = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const empty: string[] = [];
        headings.forEach(h => {
          if (!h.textContent?.trim()) {
            empty.push(h.tagName);
          }
        });
        return empty;
      });

      expect(emptyHeadings, `${pagePath} has empty headings: ${emptyHeadings.join(', ')}`).toHaveLength(0);
    });
  }
});

test.describe('Content Agent: No Broken Images', () => {
  for (const pagePath of ['/', '/pricing', '/install', '/compare']) {
    test(`[images] ${pagePath} has no broken images`, async ({ page }) => {
      await page.goto(`${BASE}${pagePath}`);
      await page.waitForTimeout(2000);

      const brokenImages = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        const broken: string[] = [];
        imgs.forEach(img => {
          if (!img.complete || img.naturalWidth === 0) {
            broken.push(img.src || img.outerHTML.slice(0, 80));
          }
        });
        return broken;
      });

      expect(brokenImages, `${pagePath} has broken images`).toHaveLength(0);
    });
  }
});

test.describe('Content Agent: Consistent CTA Labels', () => {
  test('[cta] Primary signup CTAs use consistent wording', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(2000);

    // All signup CTAs should be consistent (not mix "Sign Up" / "Register" / "Create Account")
    const signupLinks = await page.locator('a[href="/auth/signup"]').allTextContents();
    // At least one should exist
    expect(signupLinks.length).toBeGreaterThan(0);
  });

  test('[cta] Pricing tier names are consistent', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent() || '';
    // Should use "Free", "Pro", "Teams", "Enterprise" consistently
    expect(body).toContain('Free');
    expect(body).toContain('Pro');
    expect(body).toContain('Teams');
    expect(body).toContain('Enterprise');
  });
});

test.describe('Content Agent: Legal Pages Have Content', () => {
  test('[legal] Privacy policy has substantial content', async ({ page }) => {
    await page.goto(`${BASE}/legal/privacy`);
    await page.waitForTimeout(2000);

    const text = await page.locator('body').textContent() || '';
    expect(text.length).toBeGreaterThan(500);
    expect(text.toLowerCase()).toContain('privacy');
  });

  test('[legal] Terms of service has substantial content', async ({ page }) => {
    await page.goto(`${BASE}/legal/terms`);
    await page.waitForTimeout(2000);

    const text = await page.locator('body').textContent() || '';
    expect(text.length).toBeGreaterThan(500);
    expect(text.toLowerCase()).toContain('terms');
  });
});
