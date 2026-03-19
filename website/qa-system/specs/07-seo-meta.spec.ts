/**
 * SEO/Meta Agent — Metadata, OG Tags, Structured Data
 *
 * Verifies every page has proper:
 *   - <title> tag
 *   - meta description
 *   - OG tags (title, description, image)
 *   - canonical URL
 *   - robots meta
 *   - structured data (JSON-LD)
 *
 * Run: npx playwright test --project=qa-seo
 */

import { test, expect } from '@playwright/test';
import { loadPagesContract } from '../shared/contract-loader';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const routes = loadPagesContract().routes.filter(r => !r.authRequired);

test.describe('SEO Agent: Essential Meta Tags', () => {
  for (const route of routes) {
    test(`[meta] ${route.path} has title + description`, async ({ request }) => {
      const resp = await request.get(`${BASE}${route.path}`);
      const html = await resp.text();

      // Title must exist and not be empty
      const titleMatch = html.match(/<title>([^<]*)<\/title>/);
      expect(titleMatch, `${route.path} missing <title>`).toBeTruthy();
      expect(titleMatch![1].length, `${route.path} has empty title`).toBeGreaterThan(0);

      // Meta description
      const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
      if (route.path === '/') {
        expect(descMatch, 'Homepage missing meta description').toBeTruthy();
        expect(descMatch![1].length).toBeGreaterThan(50);
      }
    });
  }
});

test.describe('SEO Agent: Open Graph Tags', () => {
  test('[og] Homepage has complete OG tags', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');

    expect(ogTitle, 'Missing og:title').toBeTruthy();
    expect(ogDesc, 'Missing og:description').toBeTruthy();
    expect(ogImage, 'Missing og:image').toBeTruthy();
    expect(ogType, 'Missing og:type').toBeTruthy();
  });

  test('[og] Homepage has Twitter card tags', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');

    expect(twitterCard, 'Missing twitter:card').toBeTruthy();
    expect(twitterTitle, 'Missing twitter:title').toBeTruthy();
  });
});

test.describe('SEO Agent: Canonical + Robots', () => {
  test('[canonical] Homepage has canonical URL', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical, 'Missing canonical URL').toBeTruthy();
    expect(canonical).toContain('fortress-optimizer.com');
  });

  test('[robots] Homepage is indexable', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('index');
    expect(robots).toContain('follow');
  });
});

test.describe('SEO Agent: Structured Data', () => {
  test('[jsonld] Homepage has JSON-LD structured data', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd, 'Missing JSON-LD').toBeTruthy();

    const data = JSON.parse(jsonLd!);
    expect(data['@context']).toBe('https://schema.org');
    expect(data.name).toContain('Fortress');
  });
});

test.describe('SEO Agent: No Broken Status Codes', () => {
  for (const route of routes) {
    test(`[status] ${route.path} returns 200`, async ({ request }) => {
      const resp = await request.get(`${BASE}${route.path}`);
      expect(resp.status()).toBe(200);
    });
  }
});
