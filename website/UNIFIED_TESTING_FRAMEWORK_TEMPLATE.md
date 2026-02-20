# Unified Testing Framework Setup
## Shared across all projects: Website, VSCode Extensions, IMAystems, Web Automation

This template provides a standardized testing approach for rapid, consistent deployment.

---

## Installation & Setup

```bash
# Install testing dependencies
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @playwright/test \
  @types/jest \
  jest-environment-jsdom \
  ts-jest \
  supertest \
  @types/supertest \
  @snyk/cli

# Install performance testing
npm install --save-dev \
  lighthouse \
  @lighthouse-ci/cli

# Install security scanning
npm install --save-dev \
  snyk \
  eslint-plugin-security
```

---

## Jest Configuration (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
```

---

## Jest Setup File (jest.setup.js)

```javascript
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Global test timeout
jest.setTimeout(10000);

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## Playwright Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Example Unit Test (utils/__tests__/helpers.test.ts)

```typescript
import { calculateSavings, formatCurrency } from '../helpers';

describe('helpers', () => {
  describe('calculateSavings', () => {
    it('should calculate savings correctly', () => {
      const result = calculateSavings(1000, 0.2);
      expect(result).toBe(200);
    });

    it('should handle edge cases', () => {
      expect(calculateSavings(0, 0.2)).toBe(0);
      expect(calculateSavings(1000, 0)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      const result = formatCurrency(1000);
      expect(result).toBe('$1,000.00');
    });
  });
});
```

---

## Example API Test (api/__tests__/optimize.test.ts)

```typescript
import request from 'supertest';
import app from '../../app';

describe('POST /api/optimize', () => {
  it('should optimize tokens', async () => {
    const response = await request(app)
      .post('/api/optimize')
      .send({
        tokens: 1000,
        channel: 'slack',
      })
      .expect(200);

    expect(response.body).toHaveProperty('optimized');
    expect(response.body.optimized).toBeLessThan(1000);
  });

  it('should validate input', async () => {
    const response = await request(app)
      .post('/api/optimize')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});
```

---

## Example E2E Test (tests/e2e/homepage.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and show hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Fortress Token Optimizer');
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should track metrics', async ({ page }) => {
    await page.goto('/');
    const metric = page.locator('[data-testid="visitor-metric"]');
    await expect(metric).toBeVisible();
  });
});
```

---

## Lighthouse CI Configuration (.lighthouse-ci.json)

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "configPath": "./lighthouse-config.js"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## GitHub Actions Workflow (.github/workflows/test.yml)

```yaml
name: Test & Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: Run API tests
        run: npm run test:api
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db

      - name: Build
        run: npm run build

      - name: Run security scan
        run: npx snyk test --severity-threshold=high
        continue-on-error: true

  playwright:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern='__tests__|test'",
    "test:api": "jest --testPathPattern='api.*test'",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:lighthouse": "lhci autorun",
    "test:security": "snyk test --severity-threshold=high",
    "test:all": "npm run test:coverage && npm run test:e2e && npm run test:security",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "build": "next build",
    "dev": "next dev"
  }
}
```

---

## Pre-Deployment Checklist

Before every deployment to production:

```bash
# Run full test suite
npm run test:all

# Check types
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Performance audit
npm run test:lighthouse

# Manual smoke test
# 1. Open http://localhost:3000
# 2. Test critical user flows
# 3. Check admin dashboard
# 4. Verify API responses
```

---

## Test Coverage Standards

- **Overall**: 80%+ coverage minimum
- **Critical Paths**: 100% coverage (auth, payments, data)
- **Utils**: 90%+ coverage
- **Components**: 85%+ coverage
- **API Routes**: 90%+ coverage

---

## Continuous Integration Status

After implementing this framework:
- ✅ Automatic testing on every push
- ✅ Code coverage tracking
- ✅ Performance regression detection
- ✅ Security vulnerability scanning
- ✅ E2E testing in real browser
- ✅ Build artifact validation
- ✅ Automatic deployment on main branch success

---

## Migration Guide

### For Website Project
1. Copy this jest.config.js
2. Copy this playwright.config.ts
3. Copy GitHub Actions workflow
4. Run: `npm install` (dependencies)
5. Create `src/__tests__` directory
6. Migrate existing tests to new structure
7. Run: `npm run test:all` to verify

### For VSCode Extension
1. Adapt jest config for electron
2. Add Playwright for UI testing
3. Create mock tests for extension APIs
4. Update CI workflow for VS Code build

### For IMAystems
1. Merge with existing Docker test framework
2. Keep Visual Council review gates
3. Add unit test coverage requirements
4. Integrate with Amplify CI/CD

### For Web Automation
1. **FIRST: Initialize git repo**
2. Copy testing framework
3. Create automated test runners
4. Integrate with Vercel deployment
5. Add screenshot diffing for visual regression

---

## Resources & Documentation

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Snyk Security Scanning](https://snyk.io/)

---

*This template ensures consistency, reliability, and rapid deployment across all projects.*
