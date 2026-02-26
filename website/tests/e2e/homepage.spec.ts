import { test, expect } from '@playwright/test';

/**
 * Example E2E tests for homepage
 * Run: npm run test:e2e
 * Debug: npm run test:e2e:debug
 */

test.describe('Homepage', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check that main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Fortress Token Optimizer');
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check navigation exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check for key navigation links
    const dashboardLink = page.locator('a:has-text("Dashboard")');
    await expect(dashboardLink).toBeVisible();
  });

  test('should display pricing section', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to pricing section or check if visible
    const pricingSection = page.locator('text=Pricing').first();
    await expect(pricingSection).toBeVisible({ timeout: 5000 });
  });

  test('should have functional sign in button', async ({ page }) => {
    await page.goto('/');
    
    // Find and click sign in button
    const signInButton = page.locator('a, button').filter({ hasText: /Sign In|Login/i }).first();
    await expect(signInButton).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that main heading is still visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fortress|Token|Optimizer/);
  });

  test('should load without errors', async ({ page }) => {
    // Capture console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Check for critical errors (warnings are ok during development)
    const criticalErrors = errors.filter(e => 
      !e.includes('Warning') && 
      !e.includes('Deprecation')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to dashboard
    const dashboardLink = page.locator('a:has-text("Dashboard")');
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await expect(page).toHaveURL(/.*dashboard/);
    }
  });
});
