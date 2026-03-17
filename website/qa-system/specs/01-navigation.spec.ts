/**
 * Navigation Agent — Contract-Driven Link Verification
 *
 * Tests every link, CTA, and button in the site contract.
 * For each entry:
 *   1. Navigate to source page
 *   2. Find element by selector → visible + enabled
 *   3. Click it
 *   4. Verify destination URL matches contract
 *   5. Verify page marker is present on arrival
 *   6. Capture console errors + network failures as evidence
 *
 * Run: npx playwright test --project=qa-navigation
 */

import { test, expect } from '../shared/fixtures';
import { generateLinkTests, generateRouteTests, type LinkEntry } from '../shared/contract-loader';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

// ─────────────────────────────────────────────────────────────────────────────
// Route health checks — every page returns expected status
// ─────────────────────────────────────────────────────────────────────────────

const routes = generateRouteTests({ authRequired: false });

test.describe('Navigation Agent: Route Health', () => {
  for (const route of routes) {
    test(`[route] ${route.path} → ${route.status}`, async ({ request }) => {
      const resp = await request.get(`${BASE}${route.path}`);
      expect(resp.status()).toBe(route.status);
    });
  }
});

test.describe('Navigation Agent: Route Titles', () => {
  for (const route of routes) {
    test(`[title] ${route.path} contains "${route.expectedTitle}"`, async ({ page }) => {
      await page.goto(`${BASE}${route.path}`);
      await expect(page).toHaveTitle(new RegExp(route.expectedTitle, 'i'));
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Link verification — every link goes to the right place
// ─────────────────────────────────────────────────────────────────────────────

const allLinks = generateLinkTests({ authRequired: false });

// Separate mailto links (can't click-navigate) from regular links
const clickableLinks = allLinks.filter(l => l.clickType !== 'mailto');
const mailtoLinks = allLinks.filter(l => l.clickType === 'mailto');

// Separate router-based navigation (buttons that call router.push) from href links
const hrefLinks = clickableLinks.filter(l => l.clickType !== 'router');
const routerLinks = clickableLinks.filter(l => l.clickType === 'router');

test.describe('Navigation Agent: Link Destinations', () => {
  for (const link of hrefLinks) {
    test(`[${link.priority}] ${link.id}: ${link.source} → ${link.expectedDestination}`, async ({ page, evidence }) => {
      await page.goto(`${BASE}${link.source}`);
      // Wait for hydration
      await page.waitForTimeout(1500);

      const el = page.locator(link.selector).first();

      // Element must exist in DOM
      await expect(el).toHaveCount(1, {
        timeout: 5000,
      });

      // Scroll into view (may be below fold)
      await el.scrollIntoViewIfNeeded();

      // Click and wait for navigation
      await el.click();
      await page.waitForTimeout(2000);

      // Verify destination
      const currentUrl = page.url().replace(BASE, '');
      expect(
        currentUrl,
        `${link.id}: Expected ${link.expectedDestination} but got ${currentUrl}`
      ).toContain(link.expectedDestination);

      // Verify page marker if specified
      if (link.pageMarker) {
        await expect(page.locator(link.pageMarker).first()).toBeVisible({ timeout: 5000 });
      }

      // No 500 errors in network
      const serverErrors = evidence.networkErrors.filter(e => e.status >= 500);
      expect(serverErrors, `Server errors on ${link.id}`).toHaveLength(0);
    });
  }
});

test.describe('Navigation Agent: Router-Based Navigation', () => {
  for (const link of routerLinks) {
    test(`[${link.priority}] ${link.id}: ${link.source} → ${link.expectedDestination}`, async ({ page, evidence }) => {
      await page.goto(`${BASE}${link.source}`);
      // Wait for React hydration (router.push needs JS)
      await page.waitForTimeout(3000);

      const el = page.locator(link.selector).first();
      await expect(el).toHaveCount(1, { timeout: 5000 });
      await el.scrollIntoViewIfNeeded();
      await el.click();

      // Router navigation is client-side — wait for URL change
      await page.waitForTimeout(3000);

      const currentUrl = page.url().replace(BASE, '');
      expect(
        currentUrl,
        `${link.id}: Expected ${link.expectedDestination} but got ${currentUrl}`
      ).toContain(link.expectedDestination);

      if (link.pageMarker) {
        await expect(page.locator(link.pageMarker).first()).toBeVisible({ timeout: 5000 });
      }

      const serverErrors = evidence.networkErrors.filter(e => e.status >= 500);
      expect(serverErrors, `Server errors on ${link.id}`).toHaveLength(0);
    });
  }
});

test.describe('Navigation Agent: Mailto Links', () => {
  for (const link of mailtoLinks) {
    test(`[${link.priority}] ${link.id}: has correct mailto href`, async ({ page }) => {
      await page.goto(`${BASE}${link.source}`);
      await page.waitForTimeout(1500);

      const el = page.locator(link.selector).first();
      await expect(el).toHaveCount(1, { timeout: 5000 });

      const href = await el.getAttribute('href');
      expect(href, `${link.id}: Expected mailto link`).toContain('mailto:');
    });
  }
});
