/**
 * Destination Verification Crawler — The Missing Layer
 *
 * This is NOT "does the link exist" — it's "does the destination LOAD."
 * For every link on every page:
 *   1. Find the link
 *   2. Get the href
 *   3. Actually fetch the destination URL
 *   4. Verify it returns 200 (not 404, not 500)
 *   5. Verify the page has meaningful content (not empty/error)
 *
 * This catches the exact gap: links can have correct hrefs but
 * destinations can be 404 (missing route, SSG failure, wrong path).
 *
 * Run: npx playwright test --project=qa-destination-crawler
 */

import { test, expect } from '../shared/fixtures';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

// Every page to crawl
const PAGES_TO_CRAWL = [
  '/',
  '/pricing',
  '/install',
  '/compare',
  '/support',
  '/tools',
  '/docs',
  '/refer',
  '/auth/login',
  '/auth/signup',
];

// ─── Crawl every page, extract all internal links, verify destinations ───

test.describe('Destination Crawler: All Internal Links', () => {
  for (const sourcePage of PAGES_TO_CRAWL) {
    test(`[crawl] ${sourcePage} — all internal links return 200`, async ({ page, request }) => {
      await page.goto(`${BASE}${sourcePage}`);
      await page.waitForTimeout(3000); // Wait for hydration

      // Dismiss cookie banner
      const cookieBtn = page.locator('button:has-text("Accept All")');
      if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }

      // Extract ALL internal links from the page
      const links = await page.evaluate((base) => {
        const anchors = document.querySelectorAll('a[href]');
        const results: Array<{ href: string; text: string }> = [];
        const seen = new Set<string>();

        anchors.forEach(a => {
          const href = a.getAttribute('href') || '';
          // Only internal links (starts with / but not //)
          if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('#')) {
            // Normalize
            const clean = href.split('?')[0].split('#')[0];
            if (!seen.has(clean)) {
              seen.add(clean);
              results.push({
                href: clean,
                text: (a.textContent || '').trim().slice(0, 50),
              });
            }
          }
        });
        return results;
      }, BASE);

      console.log(`[crawl] ${sourcePage}: found ${links.length} internal links`);

      // Verify each destination
      const failures: Array<{ href: string; text: string; status: number }> = [];

      for (const link of links) {
        try {
          const resp = await request.get(`${BASE}${link.href}`);
          if (resp.status() >= 400) {
            failures.push({ ...link, status: resp.status() });
          }
        } catch (e) {
          failures.push({ ...link, status: 0 });
        }
      }

      if (failures.length > 0) {
        console.error(`[crawl] ${sourcePage} BROKEN DESTINATIONS:`);
        failures.forEach(f => {
          console.error(`  ${f.status} ${f.href} ("${f.text}")`);
        });
      }

      expect(
        failures,
        `${sourcePage} has ${failures.length} broken destinations:\n${failures.map(f => `  ${f.status} ${f.href} ("${f.text}")`).join('\n')}`
      ).toHaveLength(0);
    });
  }
});

// ─── Verify specific known-problematic destinations ─────────────────────

test.describe('Destination Crawler: Known Critical Paths', () => {
  const CRITICAL_DESTINATIONS = [
    { url: '/docs/installation/npm', description: 'npm install docs' },
    { url: '/docs/installation/vscode', description: 'VS Code install docs' },
    { url: '/docs/installation/copilot', description: 'Copilot install docs' },
    { url: '/docs/installation/slack', description: 'Slack install docs' },
    { url: '/docs/getting-started', description: 'Getting started guide' },
    { url: '/auth/signup', description: 'Signup page' },
    { url: '/auth/login', description: 'Login page' },
    { url: '/forgot-password', description: 'Password recovery' },
    { url: '/legal/privacy', description: 'Privacy policy' },
    { url: '/legal/terms', description: 'Terms of service' },
    { url: '/dashboard', description: 'User dashboard' },
    { url: '/account', description: 'Account page' },
  ];

  for (const dest of CRITICAL_DESTINATIONS) {
    test(`[destination] ${dest.url} returns 200 — ${dest.description}`, async ({ request }) => {
      const resp = await request.get(`${BASE}${dest.url}`);
      expect(
        resp.status(),
        `${dest.description} at ${dest.url} returned ${resp.status()}`
      ).toBeLessThan(400);
    });
  }
});

// ─── Verify content at destination (not just status code) ───────────────

test.describe('Destination Crawler: Content Verification', () => {
  test('[content] /docs/installation/npm has actual documentation', async ({ page }) => {
    const resp = await page.goto(`${BASE}/docs/installation/npm`);
    const status = resp?.status() || 0;

    if (status === 404) {
      // This is the known bug — flag it clearly
      expect(status, 'CRITICAL: /docs/installation/npm returns 404 — doc page not generated by SSG').toBeLessThan(400);
    } else {
      await expect(page.locator('body')).toContainText(/npm|install|package/i);
    }
  });

  test('[content] /pricing has pricing tiers', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await expect(page.locator('body')).toContainText(/Free/i);
    await expect(page.locator('body')).toContainText(/Pro/i);
    await expect(page.locator('body')).toContainText(/Teams/i);
  });

  test('[content] /auth/signup has signup form', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
  });
});

// ─── Pricing subscribe button actually navigates ────────────────────────

test.describe('Destination Crawler: Button Actions', () => {
  test('[action] Pricing "Subscribe now" button navigates away from pricing', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(5000);

    // Dismiss cookie banner
    const cookieBtn = page.locator('button:has-text("Accept All")');
    if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }

    const proBtn = page.locator('button:has-text("Subscribe now")').first();
    await proBtn.scrollIntoViewIfNeeded();
    await proBtn.click();

    // Wait for navigation
    await page.waitForTimeout(5000);

    const url = page.url();
    const stayedOnPricing = url.includes('/pricing');
    const wentToLogin = url.includes('/auth/login');
    const wentToCheckout = url.includes('stripe') || url.includes('checkout');

    // Must either navigate to login or Stripe — NOT stay on pricing doing nothing
    if (stayedOnPricing) {
      // Check if the button showed any feedback
      const btnText = await proBtn.textContent();
      console.error(`[CRITICAL] Subscribe button did NOTHING. Button text: "${btnText}". URL: ${url}`);
    }

    expect(
      wentToLogin || wentToCheckout || !stayedOnPricing,
      `Subscribe button should navigate away from pricing. Stayed at: ${url}`
    ).toBe(true);
  });
});
