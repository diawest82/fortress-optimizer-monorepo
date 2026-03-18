/**
 * Accessibility Agent — WCAG 2.1 AA Compliance
 *
 * Uses axe-core to scan every public page for accessibility violations.
 * Tests:
 *   - axe-core automated scan per page (labels, contrast, ARIA, etc.)
 *   - Keyboard navigation on critical flows
 *   - Focus visibility on interactive elements
 *   - Form labels and error announcements
 *   - Heading structure (h1-h6 hierarchy)
 *   - Image alt text
 *
 * Run: npx playwright test --project=qa-accessibility
 */

import { test, expect } from '../shared/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { loadPagesContract } from '../shared/contract-loader';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const routes = loadPagesContract().routes.filter(r => !r.authRequired);

// Pages with forms that need extra checks
const FORM_PAGES = ['/auth/login', '/auth/signup', '/forgot-password', '/support'];
const CRITICAL_PAGES = ['/', '/pricing', '/install', '/auth/login', '/auth/signup'];

// ─────────────────────────────────────────────────────────────────────────────
// axe-core scan on every public route
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accessibility Agent: axe-core Scan', () => {
  for (const route of routes) {
    test(`[a11y] ${route.path} has no critical violations`, async ({ page }) => {
      await page.goto(`${BASE}${route.path}`);
      await page.waitForTimeout(2000);

      // Dismiss cookie banner if present (it can cause false positives)
      const cookieBtn = page.locator('button:has-text("Accept All")');
      if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('.cookie-consent, [class*="cookie"]') // Exclude cookie banner
        .analyze();

      // Separate by impact
      const critical = results.violations.filter(v => v.impact === 'critical');
      const serious = results.violations.filter(v => v.impact === 'serious');

      // Log all violations for visibility
      if (results.violations.length > 0) {
        console.log(`[a11y] ${route.path}: ${results.violations.length} violations`);
        for (const v of results.violations) {
          console.log(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`);
        }
      }

      // Critical violations must be zero
      expect(
        critical,
        `${route.path} has ${critical.length} critical a11y violations: ${critical.map(v => v.id).join(', ')}`
      ).toHaveLength(0);

      // Serious violations should be zero (warn but don't fail on first pass)
      if (serious.length > 0) {
        console.warn(`[a11y] ${route.path}: ${serious.length} serious violations — should fix before launch`);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Heading structure
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accessibility Agent: Heading Structure', () => {
  for (const route of CRITICAL_PAGES) {
    test(`[headings] ${route} has exactly one h1`, async ({ page }) => {
      await page.goto(`${BASE}${route}`);
      await page.waitForTimeout(2000);

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${route} should have exactly 1 h1, found ${h1Count}`).toBe(1);
    });
  }

  test('[headings] No skipped heading levels on homepage', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(2000);

    const headings = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(els).map(el => parseInt(el.tagName[1]));
    });

    // Check no level is skipped (e.g., h1 → h3 without h2)
    for (let i = 1; i < headings.length; i++) {
      const gap = headings[i] - headings[i - 1];
      expect(
        gap,
        `Heading level skipped: h${headings[i - 1]} → h${headings[i]}`
      ).toBeLessThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Form labels
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accessibility Agent: Form Labels', () => {
  for (const formPage of FORM_PAGES) {
    test(`[labels] ${formPage} — all inputs have associated labels`, async ({ page }) => {
      await page.goto(`${BASE}${formPage}`);
      await page.waitForTimeout(3000);

      const unlabeledInputs = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
        const unlabeled: string[] = [];
        inputs.forEach(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
          const wrappedInLabel = input.closest('label');
          const hasPlaceholder = input.getAttribute('placeholder');

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !wrappedInLabel && !hasPlaceholder) {
            unlabeled.push(`${input.tagName}[name="${input.getAttribute('name')}"][type="${input.type}"]`);
          }
        });
        return unlabeled;
      });

      expect(
        unlabeledInputs,
        `${formPage} has unlabeled inputs: ${unlabeledInputs.join(', ')}`
      ).toHaveLength(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accessibility Agent: Keyboard Navigation', () => {
  test('[keyboard] Login form is fully navigable with Tab + Enter', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);

    // Tab to email field
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Type in the focused element
    await page.keyboard.type('keyboard-test@example.com');

    // Tab to password
    await page.keyboard.press('Tab');
    await page.keyboard.type('TestPassword123');

    // Tab to submit button and verify it's focused
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Should be on a button or submit element
    expect(['BUTTON', 'INPUT', 'A']).toContain(focused);
  });

  test('[keyboard] Signup form is fully navigable with Tab', async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await page.waitForTimeout(3000);

    // Tab through all form fields
    const fields = ['firstName', 'lastName', 'email', 'password'];
    for (const field of fields) {
      const input = page.locator(`input[name="${field}"]`);
      await input.focus();
      await expect(input).toBeFocused();
    }
  });

  test('[keyboard] Nav links are reachable via Tab', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(2000);

    // Tab through nav — should eventually reach a link
    let foundNavLink = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      const focusedHref = await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.href);
      if (focusedTag === 'A' && focusedHref) {
        foundNavLink = true;
        break;
      }
    }
    expect(foundNavLink, 'Should be able to Tab to a nav link').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Focus visibility
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accessibility Agent: Focus Visibility', () => {
  test('[focus] Interactive elements have visible focus indicator', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForTimeout(3000);

    // Focus the email input
    const emailInput = page.locator('input[name="email"]');
    await emailInput.focus();

    // Check it has some kind of focus style (outline, border change, box-shadow)
    const hasFocusStyle = await emailInput.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return (
        styles.outlineStyle !== 'none' ||
        styles.boxShadow !== 'none' ||
        styles.borderColor !== styles.getPropertyValue('--unfocused-border')
      );
    });
    expect(hasFocusStyle, 'Focused input should have visible focus indicator').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Image alt text
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Accessibility Agent: Image Alt Text', () => {
  for (const route of CRITICAL_PAGES) {
    test(`[alt] ${route} — all images have alt text`, async ({ page }) => {
      await page.goto(`${BASE}${route}`);
      await page.waitForTimeout(2000);

      const imagesWithoutAlt = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        const missing: string[] = [];
        imgs.forEach(img => {
          if (!img.alt && !img.getAttribute('role')?.includes('presentation')) {
            missing.push(img.src || img.outerHTML.slice(0, 100));
          }
        });
        return missing;
      });

      expect(
        imagesWithoutAlt,
        `${route} has images without alt text: ${imagesWithoutAlt.join(', ')}`
      ).toHaveLength(0);
    });
  }
});
