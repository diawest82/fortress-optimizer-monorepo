/**
 * Sitemap & Robots — SEO Crawlability Verification
 * Ensures search engines can discover and index all public pages.
 */

import { test, expect } from '@playwright/test';
import { loadPagesContract } from '../shared/contract-loader';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Sitemap & Robots: SEO Crawlability', () => {

  test.describe('robots.txt', () => {
    test('/robots.txt returns 200', async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      expect(res.status).toBe(200);
    });

    test('robots.txt allows root /', async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      const text = await res.text();
      expect(text).toContain('Allow: /');
    });

    test('robots.txt disallows /admin', async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      const text = await res.text();
      expect(text).toContain('Disallow: /admin');
    });

    test('robots.txt disallows /api', async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      const text = await res.text();
      expect(text).toContain('Disallow: /api');
    });

    test('robots.txt disallows /auth', async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      const text = await res.text();
      expect(text).toContain('Disallow: /auth');
    });

    test('robots.txt references sitemap', async () => {
      const res = await fetch(`${BASE}/robots.txt`);
      const text = await res.text();
      expect(text.toLowerCase()).toContain('sitemap:');
      expect(text).toContain('sitemap.xml');
    });
  });

  test.describe('sitemap.xml', () => {
    test('/sitemap.xml returns 200', async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      expect(res.status).toBe(200);
    });

    test('Sitemap is valid XML with urlset', async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      const text = await res.text();
      expect(text).toContain('<?xml');
      expect(text).toContain('<urlset');
      expect(text).toContain('</urlset>');
    });

    test('Sitemap contains all public routes from pages contract', async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      const sitemap = await res.text();
      const contract = loadPagesContract();
      const publicRoutes = contract.routes.filter(r => !r.authRequired);

      for (const route of publicRoutes) {
        // Skip routes that shouldn't be in sitemap (auth, admin, utility pages)
        if (route.path.includes('/admin') || route.path.includes('/reset-password') ||
            route.path.includes('/auth/') || route.path.includes('/forgot-password') ||
            route.path.includes('/logo-showcase') || route.path.includes('/dashboard') ||
            route.path.includes('/account')) continue;
        const fullUrl = `${BASE.replace('https://www.', 'https://www.')}${route.path}`;
        // Check if sitemap has this route (with or without www)
        const inSitemap = sitemap.includes(route.path);
        expect(inSitemap, `Missing from sitemap: ${route.path}`).toBe(true);
      }
    });

    test('Sitemap does NOT contain protected routes', async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      const sitemap = await res.text();
      const forbidden = ['/admin', '/api/', '/auth/', '/dashboard', '/account'];
      for (const path of forbidden) {
        expect(sitemap, `Sitemap should not contain ${path}`).not.toContain(`<loc>${BASE}${path}`);
      }
    });

    test('All sitemap URLs return 200', async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      const sitemap = await res.text();
      const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      expect(urls.length).toBeGreaterThan(5);

      const results = await Promise.all(
        urls.map(async (url) => {
          const r = await fetch(url, { redirect: 'follow' });
          return { url, status: r.status };
        })
      );

      const broken = results.filter(r => r.status !== 200);
      expect(broken, `Broken sitemap URLs: ${JSON.stringify(broken)}`).toHaveLength(0);
    });

    test('No duplicate URLs in sitemap', async () => {
      const res = await fetch(`${BASE}/sitemap.xml`);
      const sitemap = await res.text();
      const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      const unique = new Set(urls);
      expect(urls.length).toBe(unique.size);
    });
  });
});
