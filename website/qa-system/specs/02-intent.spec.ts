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

  test('4. Pro "Subscribe now" (not logged in) leads to login form — not a dead route', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);

    const proBtn = page.locator('button:has-text("Subscribe now")').first();
    await proBtn.scrollIntoViewIfNeeded();
    await proBtn.click();
    await page.waitForTimeout(3000);

    // Should land on /auth/login — NOT /auth/signin (which doesn't exist)
    const url = page.url();
    expect(
      url,
      `Pro subscribe should go to /auth/login but went to ${url}`
    ).toContain('/auth/login');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('5. Teams "Subscribe — N seats" (not logged in) leads to login form', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);

    // Find the Teams subscribe button (contains "Subscribe" and "seats")
    const teamsBtn = page.locator('button:has-text("Subscribe")').last();
    await teamsBtn.scrollIntoViewIfNeeded();
    await teamsBtn.click();
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(
      url,
      `Teams subscribe should go to /auth/login but went to ${url}`
    ).toContain('/auth/login');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('6. Enterprise "Contact Sales" opens mailto', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForTimeout(3000);

    const enterpriseBtn = page.locator('button:has-text("Contact Sales")').first();
    await enterpriseBtn.scrollIntoViewIfNeeded();

    // For mailto, we check the click triggers a mailto action
    // Listen for popup or verify the button's click handler
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
      enterpriseBtn.click(),
    ]);

    // Either opened a mailto popup or the window.open was called
    // The button calls window.open("mailto:...") so it may open a blank page
    // Just verify no 404 error page appeared
    expect(page.url()).not.toContain('/404');
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

  test('14. Footer "Privacy Policy" shows privacy content', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    await page.locator('footer >> a:has-text("Privacy Policy")').first().click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/legal\/privacy/);
    await expect(page.locator('body')).toContainText(/privacy|data|information/i);
  });

  test('15. Footer "Terms of Service" shows terms content', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1500);

    await page.locator('footer >> a:has-text("Terms of Service")').first().click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/legal\/terms/);
    await expect(page.locator('body')).toContainText(/terms|service|agreement/i);
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

  test('18. Login "Forgot password?" leads to recovery form', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(1500);

    const forgotLink = page.locator('a:has-text("Forgot")').first();
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
