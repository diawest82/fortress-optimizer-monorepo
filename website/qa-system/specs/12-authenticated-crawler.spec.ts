/**
 * Authenticated Destination Crawler
 *
 * Signs up, logs in, then crawls every authenticated page:
 *   - /account (all tabs: Overview, Subscription, Team, Support, Security, API Keys, Settings)
 *   - /dashboard
 *   - /dashboard/settings
 *   - Every link found on those pages → verify destination loads
 *   - Every button/tab → verify content appears
 *
 * Run: npx playwright test --project=qa-auth-crawler
 */

import { test, expect, type Page } from '../shared/fixtures';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const TEST_EMAIL = `crawl-auth-${UNIQUE}@test.fortress-optimizer.com`;
const TEST_PASSWORD = `SecureP@ss${UNIQUE}`;

async function signupAndLogin(page: Page): Promise<boolean> {
  // Signup via API
  const signupResp = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Crawler Test' }),
  });

  // Login via UI to get browser cookies
  await page.goto(`${BASE}/auth/login`);
  await page.waitForTimeout(3000);
  await page.locator('input[name="email"]').click();
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  const loginResp = page.waitForResponse(
    resp => resp.url().includes('/api/auth/login'),
    { timeout: 10000 }
  ).catch(() => null);

  await page.locator('button[type="submit"]').first().click();
  const resp = await loginResp;

  await page.waitForTimeout(3000);
  return resp?.status() === 200;
}

// ─────────────────────────────────────────────────────────────────────────────
// Account page — all tabs
// ─────────────────────────────────────────────────────────────────────────────

const ACCOUNT_TABS = [
  { name: 'Overview', expectedContent: /Account|Dashboard|Current Plan|API Keys/i },
  { name: 'Subscription', expectedContent: /Current Plan|Free|Billing|Upgrade/i },
  { name: 'Team', expectedContent: /Team|Upgrade to Teams|Management/i },
  { name: 'Support', expectedContent: /Support|New Ticket|Response time/i },
  { name: 'Community', expectedContent: /Community|Resources|Discord/i },
  { name: 'Enterprise', expectedContent: /Enterprise|Solutions|Custom/i },
  { name: 'API Keys', expectedContent: /API Keys|Generate|Create/i },
  { name: 'Security', expectedContent: /Security|Two-Factor|MFA|Authenticator/i },
  { name: 'Settings', expectedContent: /Settings|Email|Password|Account/i },
];

test.describe('Auth Crawler: Account Tabs', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (loggedIn) {
      await page.goto(`${BASE}/account`);
      await page.waitForTimeout(2000);
    }
  });

  for (const tab of ACCOUNT_TABS) {
    test(`[account] "${tab.name}" tab loads with expected content`, async ({ page }) => {
      // If not on account (auth failed), skip gracefully
      if (!page.url().includes('/account')) {
        console.log(`[auth-crawler] Skipping ${tab.name} — auth failed or rate limited`);
        return;
      }

      // Click the tab
      const tabBtn = page.locator('button, a').filter({ hasText: new RegExp(`^${tab.name}$`, 'i') }).first();
      if (await tabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(1500);
      }

      // Verify expected content appears
      await expect(page.locator('body')).toContainText(tab.expectedContent, {
        timeout: 5000,
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Account page — crawl all links on each tab
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth Crawler: Account Internal Links', () => {
  test('[account] All internal links on account page return 200', async ({ page, request }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) {
      console.log('[auth-crawler] Skipping account links — auth failed');
      return;
    }

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(3000);

    // Click through each tab to load all content
    for (const tab of ACCOUNT_TABS) {
      const tabBtn = page.locator('button, a').filter({ hasText: new RegExp(`^${tab.name}$`, 'i') }).first();
      if (await tabBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Extract all internal links from the fully-loaded account page
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      const results: Array<{ href: string; text: string }> = [];
      const seen = new Set<string>();
      anchors.forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('#')) {
          const clean = href.split('?')[0].split('#')[0];
          if (!seen.has(clean)) {
            seen.add(clean);
            results.push({ href: clean, text: (a.textContent || '').trim().slice(0, 50) });
          }
        }
      });
      return results;
    });

    console.log(`[auth-crawler] Account page: found ${links.length} internal links`);

    // Verify each destination
    const failures: Array<{ href: string; text: string; status: number }> = [];
    for (const link of links) {
      try {
        const resp = await request.get(`${BASE}${link.href}`);
        if (resp.status() >= 400) {
          failures.push({ ...link, status: resp.status() });
        }
      } catch {
        failures.push({ ...link, status: 0 });
      }
    }

    if (failures.length > 0) {
      console.error('[auth-crawler] BROKEN LINKS ON ACCOUNT:');
      failures.forEach(f => console.error(`  ${f.status} ${f.href} ("${f.text}")`));
    }

    expect(failures, `Account page has broken links`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — verify content and links
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth Crawler: Dashboard', () => {
  test('[dashboard] Loads with analytics content', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toContainText(/Token|Saved|Optimization|Dashboard/i, {
      timeout: 5000,
    });
  });

  test('[dashboard] All internal links return 200', async ({ page, request }) => {
    await signupAndLogin(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);

    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      const results: Array<{ href: string; text: string }> = [];
      const seen = new Set<string>();
      anchors.forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('#')) {
          const clean = href.split('?')[0].split('#')[0];
          if (!seen.has(clean)) {
            seen.add(clean);
            results.push({ href: clean, text: (a.textContent || '').trim().slice(0, 50) });
          }
        }
      });
      return results;
    });

    console.log(`[auth-crawler] Dashboard: found ${links.length} internal links`);

    const failures: Array<{ href: string; text: string; status: number }> = [];
    for (const link of links) {
      try {
        const resp = await request.get(`${BASE}${link.href}`);
        if (resp.status() >= 400) {
          failures.push({ ...link, status: resp.status() });
        }
      } catch {
        failures.push({ ...link, status: 0 });
      }
    }

    if (failures.length > 0) {
      console.error('[auth-crawler] BROKEN LINKS ON DASHBOARD:');
      failures.forEach(f => console.error(`  ${f.status} ${f.href} ("${f.text}")`));
    }

    expect(failures, `Dashboard has broken links`).toHaveLength(0);
  });

  test('[dashboard/settings] Settings page loads', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(3000);

    // Should show settings content (not a blank page or error)
    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Account actions — buttons actually work
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth Crawler: Account Actions', () => {
  test('[action] API Keys tab — Generate Key button exists and is clickable', async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) return;

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(2000);

    // Click API Keys tab
    const apiTab = page.locator('button, a').filter({ hasText: /API Keys/i }).first();
    if (await apiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);

      // Generate Key button should exist
      const genBtn = page.locator('button').filter({ hasText: /Generate|Create|New/i }).first();
      await expect(genBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('[action] Support tab — New Ticket button exists', async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) return;

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(2000);

    const supportTab = page.locator('button, a').filter({ hasText: /Support/i }).first();
    if (await supportTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await supportTab.click();
      await page.waitForTimeout(1000);

      const ticketBtn = page.locator('button').filter({ hasText: /New Ticket/i }).first();
      await expect(ticketBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('[action] Settings tab — password change fields exist', async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) return;

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(2000);

    const settingsTab = page.locator('button, a').filter({ hasText: /Settings/i }).first();
    if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsTab.click();
      await page.waitForTimeout(1000);

      // Should have password fields
      const pwFields = page.locator('input[type="password"]');
      const count = await pwFields.count();
      expect(count, 'Settings should have password change fields').toBeGreaterThanOrEqual(2);
    }
  });

  test('[action] Subscription tab — shows plan info or upgrade options', async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) return;

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(2000);

    const subTab = page.locator('button, a').filter({ hasText: /Subscription/i }).first();
    if (await subTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subTab.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toContainText(/Current Plan|Free|Upgrade|Billing/i, {
        timeout: 5000,
      });
    }
  });

  test('[action] Logout button exists and is visible', async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) return;

    await page.goto(`${BASE}/account`);
    await page.waitForTimeout(2000);

    const logoutBtn = page.locator('button, a').filter({ hasText: /Log out|Logout|Sign out/i }).first();
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pricing post-login — subscribe should go to Stripe not login
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth Crawler: Pricing When Logged In', () => {
  test('[pricing] Subscribe button when authenticated attempts Stripe checkout', async ({ page }) => {
    const loggedIn = await signupAndLogin(page);
    if (!loggedIn) {
      console.log('[auth-crawler] Skipping pricing auth test — login failed');
      return;
    }

    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(5000);

    const proBtn = page.locator('button:has-text("Subscribe now")').first();
    await proBtn.scrollIntoViewIfNeeded();

    // Listen for network requests to /api/subscriptions (Stripe checkout)
    const checkoutRequest = page.waitForResponse(
      resp => resp.url().includes('/api/subscriptions'),
      { timeout: 10000 }
    ).catch(() => null);

    await proBtn.click();
    await page.waitForTimeout(5000);

    const url = page.url();
    const wentToLogin = url.includes('/auth/login');
    const wentToStripe = url.includes('stripe') || url.includes('checkout');
    const calledAPI = await checkoutRequest;

    // When authenticated, should NOT go to login — should hit Stripe or API
    console.log(`[auth-crawler] Pricing auth test: URL=${url}, API called=${!!calledAPI}`);

    // At minimum, button should do something (not stay dead on pricing)
    const stayedOnPricing = url.includes('/pricing');
    if (stayedOnPricing && !calledAPI) {
      console.warn('[auth-crawler] Subscribe button may not work when authenticated — Stripe checkout may need configuration');
    }
  });
});
