import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './agents',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_API_URL || 'https://api.fortress-optimizer.com',
  },
  projects: [
    { name: 'api-contract', testMatch: '01-api-contract.spec.ts' },
    { name: 'optimization-quality', testMatch: '02-optimization-quality.spec.ts' },
    { name: 'npm-sdk', testMatch: '03-npm-sdk.spec.ts', timeout: 120000 },
    { name: 'python-sdk', testMatch: '04-python-sdk.spec.ts' },
    { name: 'key-lifecycle', testMatch: '05-key-lifecycle.spec.ts' },
    { name: 'cross-product', testMatch: '06-cross-product.spec.ts' },
    { name: 'ide-plugins', testMatch: '07-ide-plugins.spec.ts' },
    { name: 'all', testMatch: '*.spec.ts', timeout: 120000 },
  ],
});
