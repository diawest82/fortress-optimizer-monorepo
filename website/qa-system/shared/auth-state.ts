import { Page } from '@playwright/test';

/**
 * Set up authenticated state by injecting a token into localStorage.
 * This simulates a logged-in user without requiring a real login flow.
 */
export async function setupAuthState(page: Page) {
  await page.addInitScript(() => {
    const fakeToken = btoa(JSON.stringify({
      id: 'test-user-id',
      email: 'qa-test@fortress-optimizer.com',
      name: 'QA Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    }));
    localStorage.setItem('auth_token', fakeToken);
  });
}

export async function clearAuthState(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('auth_token');
  });
}
