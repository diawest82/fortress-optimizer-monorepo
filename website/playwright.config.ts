import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: ['homepage.spec.ts', 'full-journey.spec.ts'],
    },
    {
      name: 'individual-journey',
      testMatch: 'individual-journey.spec.ts',
    },
    {
      name: 'team-journey',
      testMatch: 'team-journey.spec.ts',
    },
    {
      name: 'load-10x',
      testMatch: 'load-10x-journey.spec.ts',
      timeout: 120000,
    },
    {
      name: 'load-100x',
      testMatch: 'load-100x-journey.spec.ts',
      timeout: 300000,
    },
  ],
});
