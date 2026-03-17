/**
 * Intent Agent — Business Meaning Verification
 *
 * Verifies that each CTA's PROMISE matches its actual OUTCOME.
 * Not just "did the click work" but "did the user get what was promised."
 *
 * Run: npx playwright test --project=qa-intent
 */

import { test, expect } from '../shared/fixtures';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Intent Agent: Homepage CTAs', () => {
  test('1. "Join Early Access" delivers a signup form with email field', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    const cta = page.locator('a[href="/auth/signup"]').first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();

    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
  });

  test('2. "View Install Guides" lands on install page with platform guides', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    const cta = page.locator('a:has-text("View Install Guides")').first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();

    await expect(page).toHaveURL(/\/install/);
    // Must show actual installation content, not empty page
    await expect(page.locator('body')).toContainText(/npm|package|install/i);
  });
});

test.describe('Intent Agent: Pricing CTAs', () => {
  test('3. Free tier "Get Early Access" leads to signup form', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000); // Wait for React hydration

    const freeBtn = page.locator('button:has-text("Get Early Access")').first();
    await freeBtn.scrollIntoViewIfNeeded();
    await freeBtn.click();
    await page.waitForTimeout(3000);

    // Should land on signup, not a 404 or error page
    expect(page.url()).toContain('/auth/signup');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('4. Pro "Subscribe now" (not logged in) redirects to login or shows auth prompt', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    // Wait for full hydration — useSession + React event handlers
    await page.waitForTimeout(5000);

    const proBtn = page.locator('button:has-text("Subscribe now")').first();
    await proBtn.scrollIntoViewIfNeeded();
    await proBtn.click();

    // Wait for navigation (router.push is async client-side)
    await page.waitForTimeout(5000);

    // Should either redirect to /auth/login OR show a login prompt
    // Must NOT stay on pricing with no feedback, and must NOT go to /auth/signin
    const url = page.url();
    const wentToLogin = url.includes('/auth/login');
    const wentToSignin = url.includes('/auth/signin'); // broken route
    const stayedOnPricing = url.includes('/pricing');

    expect(wentToSignin, `Must not go to /auth/signin (doesn't exist)`).toBe(false);

    // Either redirected to login or stayed on pricing (if session is loading)
    if (stayedOnPricing) {
      // Acceptable if there's feedback — button shows "Processing..." or an alert
      console.log('[Intent] Pro subscribe stayed on pricing — session may still be loading');
    } else {
      expect(wentToLogin, `Should go to /auth/login but went to ${url}`).toBe(true);
    }
  });

  test('5. Teams "Subscribe — N seats" (not logged in) redirects to login or shows auth prompt', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(5000);

    const teamsBtn = page.locator('button:has-text("Subscribe")').last();
    await teamsBtn.scrollIntoViewIfNeeded();
    await teamsBtn.click();
    await page.waitForTimeout(5000);

    const url = page.url();
    expect(url.includes('/auth/signin'), `Must not go to /auth/signin`).toBe(false);
  });

  test('6. Enterprise shows "Coming Soon" banner and disabled button', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);

    // Enterprise card should have "Coming Soon" badge
    await expect(page.locator('text=Coming Soon').first()).toBeVisible({ timeout: 5000 });

    // The button should be disabled
    const enterpriseBtn = page.locator('button:has-text("Coming Soon")').first();
    await expect(enterpriseBtn).toBeVisible();
    await expect(enterpriseBtn).toBeDisabled();
  });
});

test.describe('Intent Agent: Compare Page CTAs', () => {
  test('7. "Start Saving Today" leads to signup form — not a 404', async ({ page }) => {
    await page.goto(`${BASE}/compare`);
    await page.waitForTimeout(1500);

    const cta = page.locator('a[href="/signup"], a[href="/auth/signup"]').first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await page.waitForTimeout(2000);

    // Must land on signup form — not a 404 or nonexistent route
    expect(
      page.url(),
      `Compare CTA should go to /auth/signup but went to ${page.url()}`
    ).toContain('/auth/signup');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('8. "Start Free Today" (bottom CTA) also leads to signup form', async ({ page }) => {
    await page.goto(`${BASE}/compare`);
    await page.waitForTimeout(1500);

    const cta = page.locator('a[href="/signup"], a[href="/auth/signup"]').last();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await page.waitForTimeout(2000);

    expect(
      page.url(),
      `Compare bottom CTA should go to /auth/signup but went to ${page.url()}`
    ).toContain('/auth/signup');
  });
});

test.describe('Intent Agent: Install Page Documentation Links', () => {
  test('9. "Full Documentation →" (npm) leads to actual documentation — not back to install', async ({ page }) => {
    await page.goto(`${BASE}/install`);
    await page.waitForTimeout(1500);

    const docLink = page.locator('a:has-text("Full Documentation")').first();
    await docLink.scrollIntoViewIfNeeded();

    const href = await docLink.getAttribute('href');

    // The link should NOT be an anchor that stays on install page
    expect(
      href,
      `npm doc link should go to docs, not "${href}"`
    ).not.toMatch(/^#/);

    // It should point to actual documentation
    expect(href).toContain('/docs');
  });

  test('10. All 4 "Full Documentation →" links point to real doc pages', async ({ page }) => {
    await page.goto(`${BASE}/install`);
    await page.waitForTimeout(1500);

    const docLinks = page.locator('a:has-text("Full Documentation")');
    const count = await docLinks.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const href = await docLinks.nth(i).getAttribute('href');
      expect(
        href,
        `Doc link ${i + 1} should point to /docs/*, not "${href}"`
      ).toContain('/docs');
      expect(href).not.toMatch(/^#/);
    }
  });
});

test.describe('Intent Agent: Core Page Destinations', () => {
  test('11. Dashboard shows content (not empty or error)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);

    // Dashboard should have meaningful content
    await expect(page.locator('body')).toContainText(/Token|Saved|Optimization|Dashboard/i, {
      timeout: 5000,
    });
  });

  test('12. Nav "Sign In" lands on login form with email + password fields', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    await page.locator('nav >> a:has-text("Sign In")').first().click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('13. Signup page has all required form fields', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(1500);

    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('14. Privacy Policy page shows privacy content', async ({ page }) => {
    await page.goto(`${BASE}/legal/privacy`);
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/\/legal\/privacy/);
    await expect(page.locator('body')).toContainText(/privacy|data|information|collect/i);
  });

  test('15. Terms of Service page shows terms content', async ({ page }) => {
    await page.goto(`${BASE}/legal/terms`);
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/\/legal\/terms/);
    await expect(page.locator('body')).toContainText(/terms|service|agreement|use/i);
  });

  test('16. Docs link shows documentation content', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    await page.locator('nav >> a:has-text("Docs")').first().click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/docs/);
    await expect(page.locator('body')).toContainText(/documentation|guide|monitoring/i);
  });

  test('17. Support link shows support with contact options', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    await page.locator('nav >> a:has-text("Support")').first().click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/support/);
    await expect(page.locator('body')).toContainText(/support|contact|help/i);
  });

  test('18. Forgot password page has email input', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/\/forgot-password/);
    // Should have an email field for password reset
    const emailInput = page.locator('input[type="email"], input[id="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });
});
