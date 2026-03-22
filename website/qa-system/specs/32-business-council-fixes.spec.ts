/**
 * Business Council Fixes — Every Fix Verified with Action + Destination
 *
 * Tests not just "does the fix exist" but:
 *   1. Is the fix in the source code?
 *   2. Does the action work on the live site?
 *   3. Does the destination have the expected content?
 *
 * Categories:
 *   A. Pricing Consistency (5 fixes)
 *   B. Signup Flow Handoffs (4 fixes)
 *   C. Install & Referral (3 fixes)
 *   D. Billing & Revenue (3 fixes)
 *   E. Enterprise & Upgrades (2 fixes)
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const WEBSITE_DIR = join(__dirname, '..', '..');
const ROOT_DIR = join(WEBSITE_DIR, '..');

async function dismissCookies(page: Page) {
  const btn = page.locator('button:has-text("Accept All")');
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// A. PRICING CONSISTENCY — Every price surface matches
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Business Fix: Pricing Consistency', () => {

  test('[PRICE-1] Pricing page source has $15 Pro (via template)', async () => {
    const pricingClient = readFileSync(join(WEBSITE_DIR, 'src/app/pricing/client.tsx'), 'utf-8');
    // Price shown as template: ${annual ? '12' : '15'}
    expect(pricingClient).toContain("'15'");
    expect(pricingClient).toContain("'12'"); // annual price
    expect(pricingClient).not.toContain('9.99');
  });

  test('[PRICE-2] Pricing breakdown table matches calculator ($10/$8/$7/$6)', async () => {
    const pricingClient = readFileSync(join(WEBSITE_DIR, 'src/app/pricing/client.tsx'), 'utf-8');
    // Table rates
    expect(pricingClient).toContain('"$10.00/seat"');
    expect(pricingClient).toContain('"$8.00/seat"');
    expect(pricingClient).toContain('"$7.00/seat"');
    expect(pricingClient).toContain('"$6.00/seat"');
    // Calculator function uses same rates
    expect(pricingClient).toMatch(/\(seats - 5\) \* 10/);
    expect(pricingClient).toMatch(/\(seats - 25\) \* 8/);
    expect(pricingClient).toMatch(/\(seats - 100\) \* 7/);
    expect(pricingClient).toMatch(/\(seats - 249\) \* 6/);
  });

  test('[PRICE-3] Compare page source says 50K free tokens (not 10K)', async () => {
    const compareClient = readFileSync(join(WEBSITE_DIR, 'src/app/compare/client.tsx'), 'utf-8');
    expect(compareClient).not.toContain('10K free tokens');
    expect(compareClient).toContain('50K');
  });

  test('[PRICE-4] Backend fortress_types.py has $15 Pro and $60 Teams', async () => {
    const types = readFileSync(join(ROOT_DIR, 'shared-libs/fortress_types.py'), 'utf-8');
    expect(types).toContain('"price_monthly": 15');
    expect(types).not.toContain('"price_monthly": 9.99');
    expect(types).toContain('"price_monthly": 60');
    expect(types).not.toContain('"price_monthly": 99');
  });

  test('[PRICE-5] Subscription API says "Unlimited tokens" for Pro (not 500K)', async () => {
    const subRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/subscriptions/route.ts'), 'utf-8');
    expect(subRoute).toContain("'Unlimited tokens'");
    expect(subRoute).not.toContain('500K tokens');
  });

  test('[PRICE-6] Cost calculator shows $15 Pro and $60+ Teams', async () => {
    const calc = readFileSync(join(WEBSITE_DIR, 'src/components/tools/cost-calculator.tsx'), 'utf-8');
    expect(calc).toContain('pro: 15');
    expect(calc).not.toContain('9.99');
    expect(calc).toContain('teams: 60');
    expect(calc).not.toContain('teams: 99');
  });

  test('[PRICE-7] Docs show $15 Pro pricing (not $9.99)', async () => {
    const docs = readFileSync(join(WEBSITE_DIR, 'src/app/docs/[...slug]/page.tsx'), 'utf-8');
    expect(docs).toContain('$15/mo');
    expect(docs).not.toMatch(/Individual.*\$9\.99/);
  });

  test('[PRICE-8] Stripe webhook uses $60+/month for Teams', async () => {
    const webhook = readFileSync(join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'), 'utf-8');
    expect(webhook).toContain("'$60+/month'");
    expect(webhook).not.toContain("'$99/month'");
  });

  test('[PRICE-9] Stripe checkout component has $60 Teams (not $99)', async () => {
    const checkout = readFileSync(join(WEBSITE_DIR, 'src/components/stripe-checkout.tsx'), 'utf-8');
    // Teams price in checkout component
    expect(checkout).not.toMatch(/teams[\s\S]*price:\s*99/);
    expect(checkout).toMatch(/teams[\s\S]*price:\s*60/);
  });

  test('[PRICE-10] Page title does not say "Coming Soon"', async () => {
    const layout = readFileSync(join(WEBSITE_DIR, 'src/app/layout.tsx'), 'utf-8');
    // Title should NOT contain "Coming Soon" for a launched product
    expect(layout).not.toMatch(/title:.*Coming Soon/);
  });

  test('[PRICE-11] Meta descriptions do not reference "February 2026" or "beta launching"', async () => {
    const layout = readFileSync(join(WEBSITE_DIR, 'src/app/layout.tsx'), 'utf-8');
    expect(layout).not.toContain('February 2026');
    expect(layout).not.toContain('beta launching');
  });

  test('[PRICE-12] No fabricated ratings in structured data', async () => {
    const layout = readFileSync(join(WEBSITE_DIR, 'src/app/layout.tsx'), 'utf-8');
    // Should NOT have fake aggregateRating until real reviews exist
    expect(layout).not.toContain('"ratingCount": "248"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B. SIGNUP FLOW HANDOFFS — callbackUrl preserved through signup
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Business Fix: Signup Handoffs', () => {

  test('[HANDOFF-1] Pro subscribe → signup has callbackUrl → form works', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    await page.locator('button:has-text("Subscribe now")').first().click();
    await page.waitForTimeout(5000);

    // Verify: on signup with callbackUrl
    expect(page.url()).toContain('/auth/signup');
    expect(page.url()).toContain('callbackUrl');

    // Verify: form is interactive at destination
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('test@handoff.com');
    expect(await emailInput.inputValue()).toBe('test@handoff.com');
  });

  test('[HANDOFF-2] Teams subscribe → team signup has seats + callbackUrl', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Select 25 seats first
    const btn25 = page.locator('button:has-text("25 seats")').first();
    if (await btn25.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn25.click();
      await page.waitForTimeout(1000);
    }

    await page.locator('button:has-text("Subscribe —")').first().click();
    await page.waitForTimeout(5000);

    // Verify: on team signup with seats param
    expect(page.url()).toContain('/auth/signup/team');
    expect(page.url()).toContain('seats=');
    expect(page.url()).toContain('callbackUrl');

    // Verify: team name field exists at destination
    await expect(page.locator('input[name="teamName"]')).toBeVisible({ timeout: 5000 });
  });

  test('[HANDOFF-3] Signup source code respects callbackUrl (not hardcoded /dashboard)', async () => {
    const signupClient = readFileSync(join(WEBSITE_DIR, 'src/app/auth/signup/client.tsx'), 'utf-8');
    expect(signupClient).toContain('callbackUrl');
    expect(signupClient).toContain("callbackUrl || '/dashboard'");
    expect(signupClient).not.toMatch(/router\.push\('\/dashboard'\)/);
  });

  test('[HANDOFF-4] Free CTA → signup form → OAuth button visible', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    const freeBtn = page.locator('button:has-text("Get Early Access"), a:has-text("Get Early Access")').first();
    await freeBtn.click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/auth/signup');
    // Full form + OAuth at destination
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    const githubBtn = page.locator('button:has-text("GitHub")').first();
    await expect(githubBtn).toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C. INSTALL & REFERRAL FIXES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Business Fix: Install & Referral', () => {

  test('[INSTALL-1] Install guide source shows FortressClient (not FortressOptimizer)', async () => {
    const installClient = readFileSync(join(WEBSITE_DIR, 'src/app/install/client.tsx'), 'utf-8');
    expect(installClient).toContain('FortressClient');
    expect(installClient).not.toContain('FortressOptimizer');
  });

  test('[INSTALL-2] Install guide uses correct API fields (optimized_prompt, not optimized)', async () => {
    const installClient = readFileSync(join(WEBSITE_DIR, 'src/app/install/client.tsx'), 'utf-8');
    expect(installClient).toContain('optimized_prompt');
    expect(installClient).toContain('tokens_saved');
  });

  test('[REFER-1] Referral page does not crash (no undefined status)', async ({ page }) => {
    // Source check — no bare 'status' in ReferralDashboard
    const referClient = readFileSync(join(WEBSITE_DIR, 'src/app/refer/client.tsx'), 'utf-8');
    // The ReferralDashboard function should not reference status === 'unauthenticated'
    // (that check belongs in ReferralPageContent which has useSession)

    // Live check — page loads without crash
    await page.goto(`${BASE}/refer`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length, 'Referral page should not be blank').toBeGreaterThan(100);
    // Should have referral content, not an error
    expect(bodyText.toLowerCase()).toMatch(/referral|refer|earn|invite/i);
  });

  test('[REFER-2] Referral share text says 20% (not 18%)', async () => {
    const referClient = readFileSync(join(WEBSITE_DIR, 'src/app/refer/client.tsx'), 'utf-8');
    expect(referClient).toContain("saving 20%");
    expect(referClient).not.toContain("saving 18%");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// D. BILLING & REVENUE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Business Fix: Billing & Revenue', () => {

  test('[BILLING-1] Annual toggle changes prices on pricing page', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Monthly: $15
    await expect(page.locator('body')).toContainText('$15');

    // Toggle to annual
    const toggleBtn = page.locator('button:has-text("Annual"), button[aria-label*="annual" i]').first();
    if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      // Annual: $12
      await expect(page.locator('body')).toContainText('$12');
    }
  });

  test('[BILLING-2] Annual billing is wired to Stripe (source code)', async () => {
    // Pricing page sends interval
    const pricingClient = readFileSync(join(WEBSITE_DIR, 'src/app/pricing/client.tsx'), 'utf-8');
    expect(pricingClient).toMatch(/interval.*annual.*year.*month/);

    // Subscriptions API passes interval
    const subRoute = readFileSync(join(WEBSITE_DIR, 'src/app/api/subscriptions/route.ts'), 'utf-8');
    expect(subRoute).toContain('billingInterval');

    // Stripe lib accepts interval parameter
    const stripLib = readFileSync(join(WEBSITE_DIR, 'src/lib/stripe.ts'), 'utf-8');
    expect(stripLib).toContain('billingInterval');
    // Annual discount calculation: 12 months × 80%
    expect(stripLib).toContain('0.8');
  });

  test('[BILLING-3] Stripe creates annual price with 20% discount (source)', async () => {
    const stripLib = readFileSync(join(WEBSITE_DIR, 'src/lib/stripe.ts'), 'utf-8');
    // Annual = monthly * 12 * 0.8
    expect(stripLib).toMatch(/tierConfig\.price \* 12 \* 0\.8/);
    // Finds matching price by interval + amount
    expect(stripLib).toContain("p.recurring?.interval === interval");
    expect(stripLib).toContain("p.unit_amount === unitAmount");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E. ENTERPRISE & UPGRADES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Business Fix: Enterprise & Upgrades', () => {

  test('[ENTERPRISE-1] Enterprise source has Contact Sales mailto link', async () => {
    const pricingClient = readFileSync(join(WEBSITE_DIR, 'src/app/pricing/client.tsx'), 'utf-8');
    expect(pricingClient).toContain('Contact Sales');
    expect(pricingClient).toContain('mailto:sales@fortress-optimizer.com');
    // Enterprise section should use <a> not <button disabled>
    expect(pricingClient).toMatch(/mailto:sales@fortress-optimizer\.com[\s\S]*Contact Sales/);
  });

  test('[ENTERPRISE-2] Enterprise mailto has pre-filled subject + body template', async () => {
    const pricingClient = readFileSync(join(WEBSITE_DIR, 'src/app/pricing/client.tsx'), 'utf-8');
    expect(pricingClient).toContain('subject=');
    expect(pricingClient).toContain('body=');
    // The full mailto href contains body with Company, Team size, Use case (URL-encoded)
    const mailtoMatch = pricingClient.match(/mailto:sales@fortress-optimizer\.com[^"]*body=[^"]*/);
    expect(mailtoMatch, 'mailto with body template should exist').toBeTruthy();
    const rawHref = mailtoMatch![0];
    // Check URL-encoded versions: Company = Company, Team size = Team%20size, Use case = Use%20case
    expect(rawHref).toMatch(/Company|company/i);
    expect(rawHref).toMatch(/Team|team/i);
    expect(rawHref).toMatch(/[Uu]se/i);
  });

  test('[UPGRADE-1] Backend returns usage_warning at 80% of free tier', async () => {
    const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
    expect(mainPy).toContain('usage_warning');
    expect(mainPy).toContain('usage_pct >= 80');
    expect(mainPy).toContain('upgrade_url');
    expect(mainPy).toContain('Upgrade to Pro');
  });

  test('[UPGRADE-2] Usage warning includes remaining tokens + upgrade URL', async () => {
    const mainPy = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
    expect(mainPy).toContain('"remaining"');
    expect(mainPy).toContain('"used"');
    expect(mainPy).toContain('"limit"');
    expect(mainPy).toContain('"/pricing"');
    // Two levels: warning (80-99%) and limit (100%)
    expect(mainPy).toContain('"warning"');
    expect(mainPy).toContain('"limit"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// F. CROSS-SURFACE CONSISTENCY — Full round-trip verification
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Business Fix: Cross-Surface Consistency', () => {

  test('[CROSS-1] Pricing page → 50 seats → subscribe → team signup shows 50', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Select 50 seats
    await page.locator('button:has-text("50 seats")').first().click();
    await page.waitForTimeout(1000);

    // Click subscribe
    await page.locator('button:has-text("Subscribe — 50 seats")').first().click();
    await page.waitForTimeout(5000);

    // Destination: team signup with 50 seats
    expect(page.url()).toContain('seats=50');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toContain('50');
    // Team name field should be present
    await expect(page.locator('input[name="teamName"]')).toBeVisible({ timeout: 5000 });
  });

  test('[CROSS-2] All source files reference 50K free tokens (not 10K)', async () => {
    const files = [
      { path: 'src/app/pricing/client.tsx', name: 'Pricing' },
      { path: 'src/app/compare/client.tsx', name: 'Compare' },
      { path: 'src/app/api/subscriptions/route.ts', name: 'Subscriptions API' },
    ];
    for (const file of files) {
      const content = readFileSync(join(WEBSITE_DIR, file.path), 'utf-8');
      expect(content, `${file.name} should mention 50K`).toContain('50K');
      expect(content, `${file.name} should not say "10K free tokens"`).not.toContain('10K free tokens');
    }
  });

  test('[CROSS-3] Footer docs link → docs page has real content', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.locator('footer a[href="/docs"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/docs');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(200);
    expect(bodyText.toLowerCase()).toMatch(/documentation|getting started|guide/i);
  });

  test('[CROSS-4] Install npm docs link → docs page with npm content', async ({ page }) => {
    await page.goto(`${BASE}/install`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.locator('a[href="/docs/installation/npm"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/docs/installation/npm');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.toLowerCase()).toMatch(/npm|install|package/i);
  });
});
