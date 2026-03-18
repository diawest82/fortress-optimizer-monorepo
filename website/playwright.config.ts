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
    {
      name: 'qa-navigation',
      testDir: './qa-system/specs',
      testMatch: '01-navigation.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-intent',
      testDir: './qa-system/specs',
      testMatch: '02-intent.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-accessibility',
      testDir: './qa-system/specs',
      testMatch: '03-accessibility.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-forms',
      testDir: './qa-system/specs',
      testMatch: '04-forms.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-visual',
      testDir: './qa-system/specs',
      testMatch: '05-visual.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-mobile',
      testDir: './qa-system/specs',
      testMatch: '06-mobile.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-seo',
      testDir: './qa-system/specs',
      testMatch: '07-seo-meta.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-security',
      testDir: './qa-system/specs',
      testMatch: '08-security.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-content',
      testDir: './qa-system/specs',
      testMatch: '09-content.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-performance',
      testDir: './qa-system/specs',
      testMatch: '10-performance.spec.ts',
      timeout: 30000,
    },
    {
      name: 'qa-system',
      testDir: './qa-system/specs',
      testMatch: '*.spec.ts',
      timeout: 30000,
    },
    // ─── Product QA Agents ───────────────────────────────────────
    {
      name: 'product-api-contract',
      testDir: './qa-system/product-agents',
      testMatch: '01-api-contract.spec.ts',
      timeout: 30000,
    },
    {
      name: 'product-quality',
      testDir: './qa-system/product-agents',
      testMatch: '02-optimization-quality.spec.ts',
      timeout: 30000,
    },
    {
      name: 'product-npm-sdk',
      testDir: './qa-system/product-agents',
      testMatch: '03-npm-sdk.spec.ts',
      timeout: 120000,
    },
    {
      name: 'product-python-sdk',
      testDir: './qa-system/product-agents',
      testMatch: '04-python-sdk.spec.ts',
      timeout: 30000,
    },
    {
      name: 'product-key-lifecycle',
      testDir: './qa-system/product-agents',
      testMatch: '05-key-lifecycle.spec.ts',
      timeout: 30000,
    },
    {
      name: 'product-cross',
      testDir: './qa-system/product-agents',
      testMatch: '06-cross-product.spec.ts',
      timeout: 30000,
    },
    {
      name: 'product-ide-plugins',
      testDir: './qa-system/product-agents',
      testMatch: '07-ide-plugins.spec.ts',
      timeout: 30000,
    },
    {
      name: 'product-all',
      testDir: './qa-system/product-agents',
      testMatch: '*.spec.ts',
      timeout: 120000,
    },
  ],
});
