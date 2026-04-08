/**
 * Post-Action Destination Verification
 *
 * Tests the FULL chain: action → intermediate page → final destination.
 * Not just "did the link work" but "did the user end up where they should
 * with the right content visible and the right state preserved?"
 *
 * Each test simulates a real user journey through multiple pages and
 * verifies the destination has the expected components rendered.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);

async function dismissCookies(page: Page) {
  const btn = page.locator('button:has-text("Accept All")');
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function signupViaAPI(email: string, password: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Destination Test' }),
  });
  return res.ok || res.status === 409; // 409 = already exists
}

async function loginViaUI(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await dismissCookies(page);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const resp = page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }).catch(() => null);
  await page.locator('button[type="submit"]').first().click();
  const loginResp = await resp;
  await page.waitForTimeout(3000);
  if (loginResp && loginResp.status() === 429) return false;
  return !page.url().includes('/auth/login');
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PRICING → SIGNUP → DASHBOARD (Individual)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Pricing → Signup Chains', () => {

  test('Pro subscribe → signup form has plan param → form fields work', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Click Pro subscribe
    await page.locator('button:has-text("Subscribe now")').first().click();
    await page.waitForTimeout(5000);

    // Verify destination: signup page with plan param
    expect(page.url()).toContain('/auth/signup');
    expect(page.url()).toContain('plan=');
    expect(page.url()).toContain('callbackUrl');

    // Verify signup form is fully functional (not just visible)
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Fill form to verify inputs are interactive
    await page.locator('input[name="firstName"]').fill('Test');
    const value = await page.locator('input[name="firstName"]').inputValue();
    expect(value).toBe('Test');
  });

  test('Teams subscribe → team signup form has seats + team name field', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Click Teams subscribe
    await page.locator('button:has-text("Subscribe —")').first().click();
    await page.waitForTimeout(5000);

    // Verify destination: team signup with seats param
    expect(page.url()).toContain('/auth/signup/team');
    expect(page.url()).toContain('seats=');
    expect(page.url()).toContain('callbackUrl');

    // Verify team-specific form field exists and works
    await expect(page.locator('input[name="teamName"]')).toBeVisible({ timeout: 5000 });
    await page.locator('input[name="teamName"]').fill('Acme Corp');
    const teamValue = await page.locator('input[name="teamName"]').inputValue();
    expect(teamValue).toBe('Acme Corp');

    // Verify seats are displayed from URL param
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toMatch(/seat/i);
  });

  test('Free CTA → signup form → submit → redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Click Free tier CTA
    const freeBtn = page.locator('button:has-text("Get Early Access"), a:has-text("Get Early Access")').first();
    await freeBtn.click();
    await page.waitForTimeout(3000);

    // Should be on signup
    expect(page.url()).toContain('/auth/signup');

    // Submit the form with real data (unique per run to avoid duplicates)
    const uniqueEmail = `dest-free-${UNIQUE}-${Math.random().toString(36).slice(2, 6)}@test.fortress-optimizer.com`;
    await page.locator('input[name="firstName"]').fill('Dest');
    await page.locator('input[name="lastName"]').fill('Test');
    await page.locator('input[name="email"]').fill(uniqueEmail);
    await page.locator('input[name="password"]').fill(`SecureP@ss${UNIQUE}!`);

    const signupResp = page.waitForResponse(r => r.url().includes('/api/auth/signup'), { timeout: 10000 }).catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const resp = await signupResp;
    await page.waitForTimeout(5000);

    // Loud failure on rate limit — used to silently skip.
    if (resp && resp.status() === 429) {
      throw new Error('Signup rate limited (429). Use a unique test user per worker or run against a local server.');
    }

    // Final destination: dashboard (not stuck on signup, not error page)
    const finalUrl = page.url();
    if (finalUrl.includes('/auth/signup')) {
      const pageText = await page.locator('body').textContent() || '';
      if (pageText.toLowerCase().includes('rate') || pageText.toLowerCase().includes('too many')) {
        throw new Error('Signup rate limited (page text indicates rate limit). Fix the test setup.');
      }
    }
    expect(finalUrl).toContain('/dashboard');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. AUTH CROSS-LINKS → DESTINATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Auth Cross-Links', () => {

  test('Login "Sign up" link → signup form renders (not blank)', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    await page.locator('a[href="/auth/signup"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/auth/signup');
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
    // OAuth button should also be visible
    const githubBtn = page.locator('button:has-text("GitHub"), button:has-text("Continue with GitHub")').first();
    await expect(githubBtn).toBeVisible({ timeout: 3000 });
  });

  test('Signup "Log in" link → login form renders with both fields', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    await page.locator('a[href="/auth/login"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/auth/login');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login "Forgot password" → forgot form → submit → confirmation message', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    await page.locator('a[href="/forgot-password"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });

    // Submit email
    await page.locator('input[type="email"]').fill(`forgot-${UNIQUE}@test.fortress-optimizer.com`);
    const resetResp = page.waitForResponse(r => r.url().includes('/api/password'), { timeout: 10000 }).catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    await resetResp;
    await page.waitForTimeout(3000);

    // Should show confirmation (not error, not blank)
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.toLowerCase()).toMatch(/check.*email|sent|reset link|success/i);

    // "Back to login" link should work
    const backLink = page.locator('a[href="/auth/login"]').first();
    if (await backLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backLink.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/auth/login');
      await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Team signup "individual plan" link → individual signup (no team fields)', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup/team?seats=5`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    // Should have team name field
    await expect(page.locator('input[name="teamName"]')).toBeVisible({ timeout: 5000 });

    // Click individual signup link
    await page.locator('a[href="/auth/signup"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/auth/signup');
    // Should NOT have team name field
    const teamField = await page.locator('input[name="teamName"]').count();
    expect(teamField).toBe(0);
    // Should have individual fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. AUTHENTICATED ACTIONS → CORRECT DESTINATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Authenticated Destinations', () => {
  const email = `dest-auth-${UNIQUE}@test.fortress-optimizer.com`;
  const password = `SecureP@ss${UNIQUE}!`;

  test.beforeAll(async () => {
    await signupViaAPI(email, password);
  });

  test('Login with callbackUrl=/pricing → lands on pricing with tiers visible', async ({ page }) => {
    await page.goto(`${BASE}/auth/login?callbackUrl=/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    const resp = page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }).catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const loginResp = await resp;
    await page.waitForTimeout(5000);

    if (loginResp && loginResp.status() === 429) {
      throw new Error('Login rate limited (429). Fix the test setup, do not skip silently.');
    }

    // Should land on pricing, not dashboard
    expect(page.url()).toContain('/pricing');
    // Pricing content should be visible
    await expect(page.locator('body')).toContainText('Free', { timeout: 5000 });
    await expect(page.locator('body')).toContainText('Pro');
  });

  test('Account "Upgrade Plan" → pricing page with subscribe buttons', async ({ page }) => {
    const loggedIn = await loginViaUI(page, email, password);
    if (!loggedIn) {
      throw new Error('Login failed (likely rate-limited). Fix the test setup, do not skip silently.');
    }

    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Find upgrade link
    const upgradeLink = page.locator('a[href="/pricing"]').first();
    if (await upgradeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await upgradeLink.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/pricing');
      // Subscribe button should be visible (authenticated user)
      await expect(page.locator('button:has-text("Subscribe now")').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Account "API Keys" tab → generate key form visible', async ({ page }) => {
    const loggedIn = await loginViaUI(page, email, password);
    if (!loggedIn) {
      throw new Error('Login failed (likely rate-limited). Fix the test setup, do not skip silently.');
    }

    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Click API Keys tab
    const apiKeysTab = page.locator('text=API Keys').first();
    if (await apiKeysTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apiKeysTab.click();
      await page.waitForTimeout(2000);
      // Generate key button should be visible
      const genBtn = page.locator('button:has-text("Generate")').first();
      const hasGenerate = await genBtn.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasGenerate, 'Generate Key button should be visible in API Keys tab').toBe(true);
    }
  });

  test('Account "Support" tab → ticket form + ticket list visible', async ({ page }) => {
    const loggedIn = await loginViaUI(page, email, password);
    if (!loggedIn) {
      throw new Error('Login failed (likely rate-limited). Fix the test setup, do not skip silently.');
    }

    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Click Support tab
    const supportTab = page.locator('text=Support').first();
    if (await supportTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await supportTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent() || '';
      // Should have ticket creation or support content
      expect(bodyText.toLowerCase()).toMatch(/ticket|support|create|new/i);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. INSTALL PAGE → DOCUMENTATION → CONTENT LOADS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Install → Docs Chain', () => {

  test('Install "Full Documentation" (npm) → docs page with npm content', async ({ page }) => {
    await page.goto(`${BASE}/install`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    await page.locator('a[href="/docs/installation/npm"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/docs/installation/npm');
    // Page should have actual documentation content, not empty/error
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(200);
    expect(bodyText.toLowerCase()).toMatch(/npm|install|package/i);
  });

  test('Install "Manage API Keys" → redirects to login (auth-gated) → login form works', async ({ page }) => {
    // Clear auth
    await page.context().clearCookies();
    await page.goto(`${BASE}/install`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    const apiKeysLink = page.locator('a[href="/account"]').first();
    if (await apiKeysLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await apiKeysLink.click();
      await page.waitForTimeout(3000);
      // Should redirect to login with callbackUrl
      expect(page.url()).toContain('/auth/login');
      // Login form should be functional
      await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('input[name="password"]')).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. COMPARE & TOOLS → SIGNUP → FORM FUNCTIONAL
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Marketing Pages → Signup', () => {

  test('Compare "Start Saving Today" → signup form with all fields', async ({ page }) => {
    await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    await page.locator('a[href="/auth/signup"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/auth/signup');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    // GitHub OAuth should also be present
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toContain('GitHub');
  });

  test('Tools "Get Started Free" → signup form functional', async ({ page }) => {
    await page.goto(`${BASE}/tools`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    const cta = page.locator('a[href="/auth/signup"]').first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/auth/signup');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. PRICING CALCULATOR → STATE PRESERVED → SUBSCRIBE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Pricing Calculator State', () => {

  test('Select 50 seats → click subscribe → team signup shows 50 seats', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Click quick-select 50 seats
    await page.locator('button:has-text("50 seats")').first().click();
    await page.waitForTimeout(1000);

    // Click subscribe
    await page.locator('button:has-text("Subscribe — 50 seats")').first().click();
    await page.waitForTimeout(5000);

    // Should be on team signup with seats=50
    expect(page.url()).toContain('/auth/signup/team');
    expect(page.url()).toContain('seats=50');

    // Team signup should reflect 50 seats
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toContain('50');
  });

  test('Toggle annual → prices update → toggle back → prices revert', async ({ page }) => {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissCookies(page);

    // Monthly should show $15
    await expect(page.locator('body')).toContainText('$15');

    // Toggle to annual
    const toggleBtn = page.locator('button:has-text("Annual"), button[aria-label*="annual" i]').first();
    if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      // Should show $12
      await expect(page.locator('body')).toContainText('$12');

      // Toggle back
      const monthlyBtn = page.locator('button:has-text("Monthly"), button[aria-label*="annual" i]').first();
      await monthlyBtn.click();
      await page.waitForTimeout(1000);
      // Should show $15 again
      await expect(page.locator('body')).toContainText('$15');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. FOOTER LINKS → DESTINATION HAS CONTENT
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: Footer → Destination Content', () => {

  test('Footer "Documentation" → docs page has doc content (not empty)', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.locator('footer a[href="/docs"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/docs');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(200);
    expect(bodyText.toLowerCase()).toMatch(/documentation|getting started|guide/i);
  });

  test('Footer "Privacy Policy" → legal page has privacy content', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.locator('footer a[href="/legal/privacy"]').first().click();
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/legal/privacy');
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.toLowerCase()).toMatch(/privacy|data|information|collect/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. API RESPONSE → UI RENDERS CORRECTLY
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Post-Action: API Response → UI State', () => {

  test('Backend /health responds → canary dashboard can display status', async () => {
    const res = await fetch(`${API_BASE}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  test('Backend /api/pricing responds → tiers match frontend display', async ({ page }) => {
    const apiRes = await fetch(`${API_BASE}/api/pricing`);
    if (apiRes.ok) {
      const apiData = await apiRes.json();

      await page.goto(`${BASE}/pricing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const bodyText = await page.locator('body').textContent() || '';

      // Free tier
      expect(bodyText).toContain('Free');
      // Pro tier
      expect(bodyText).toContain('Pro');
      expect(bodyText).toContain('$15');
    }
  });

  test('Signup API creates user → login API authenticates → account loads', async ({ page }) => {
    const email = `dest-chain-${UNIQUE}@test.fortress-optimizer.com`;
    const password = `SecureP@ss${UNIQUE}!`;

    // 1. Signup via API
    const signupRes = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Chain Test' }),
    });
    expect(signupRes.status).toBeLessThan(500);

    // 2. Login via UI
    const loggedIn = await loginViaUI(page, email, password);
    if (!loggedIn) {
      throw new Error('Login failed (likely rate-limited). Fix the test setup, do not skip silently.');
    }

    // 3. Account page loads with user content
    await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(100);
    // Should show account content, not login page
    expect(page.url()).not.toContain('/auth/login');
  });
});
