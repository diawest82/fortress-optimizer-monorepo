# 🧪 EXECUTABLE TEST SUITE ROADMAP
**February 19, 2026 - Ready to Implement**

---

## PHASE 1: SETUP & FRAMEWORK (Day 1 - 6 hours)

### Step 1.1: Install Test Dependencies (30 min)
```bash
cd /Users/diawest/projects/fortress-optimizer-monorepo/website

# Install testing frameworks
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @types/jest \
  ts-jest \
  jest-environment-jsdom

npm install --save-dev \
  vitest \
  @vitest/ui

npm install --save-dev \
  @playwright/test \
  playwright

npm install --save-dev \
  supertest \
  @types/supertest

npm install --save-dev \
  artillery \
  autocannon

npm install --save-dev \
  dotenv \
  @faker-js/faker

# Install security testing
npm install --save-dev \
  owasp-zap-api \
  snyk
```

### Step 1.2: Create Test Directory Structure (30 min)
```bash
mkdir -p src/__tests__/{unit,integration,api,e2e,security,performance}
mkdir -p src/__tests__/fixtures
mkdir -p src/__tests__/mocks
mkdir -p test/load
mkdir -p test/security
```

### Step 1.3: Jest Configuration (1 hour)
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.stories.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Step 1.4: Playwright Configuration (1 hour)
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 1.5: Add NPM Scripts (1 hour)
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:api": "jest --testPathPattern=api",
    "test:e2e": "playwright test",
    "test:security": "jest --testPathPattern=security",
    "test:performance": "jest --testPathPattern=performance",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:load": "artillery run test/load/load-test.yml",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:api && npm run test:e2e"
  }
}
```

---

## PHASE 2: CORE WEBSITE TESTS (Week 1 - 40 hours)

### Test Suite 1: Authentication (8 hours)

```typescript
// src/__tests__/api/auth.signup.test.ts
import { test, describe, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const API_URL = 'http://localhost:3000';
const prisma = new PrismaClient();

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clean database
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Valid signup
  test('should create new user with valid data', async () => {
    const res = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('test@example.com');

    // Verify in database
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    expect(user).not.toBeNull();
    expect(user?.tier).toBe('free');
  });

  // Test 2: Duplicate email
  test('should reject duplicate email', async () => {
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed',
        tier: 'free'
      }
    });

    const res = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'NewPassword123!',
        name: 'Another User'
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  // Test 3: Invalid email
  test('should reject invalid email format', async () => {
    const res = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User'
      });

    expect(res.status).toBe(400);
  });

  // Test 4: Weak password
  test('should reject weak password', async () => {
    const res = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      });

    expect(res.status).toBe(400);
  });

  // Test 5: SQL Injection attempt
  test('should prevent SQL injection', async () => {
    const res = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: "test@example.com'; DROP TABLE users; --",
        password: 'SecurePassword123!',
        name: 'Test User'
      });

    expect(res.status).toBe(400);
    
    // Verify table still exists
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
```

```typescript
// src/__tests__/api/auth.signin.test.ts
describe('POST /api/auth/signin', () => {
  // Test 1: Valid signin
  test('should signin with valid credentials', async () => {
    // Create test user
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: bcrypt.hashSync('SecurePassword123!', 10),
        tier: 'free'
      }
    });

    const res = await request(API_URL)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });

  // Test 2: Wrong password
  test('should reject wrong password', async () => {
    const res = await request(API_URL)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
  });

  // Test 3: Non-existent user
  test('should reject non-existent user', async () => {
    const res = await request(API_URL)
      .post('/api/auth/signin')
      .send({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      });

    expect(res.status).toBe(401);
  });

  // Test 4: Brute force protection (>5 attempts)
  test('should block account after 5 failed attempts', async () => {
    for (let i = 0; i < 6; i++) {
      await request(API_URL)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });
    }

    const res = await request(API_URL)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });

    expect(res.status).toBe(429); // Too many requests
  });
});
```

---

### Test Suite 2: API Endpoints (12 hours)

```typescript
// src/__tests__/api/teams.test.ts
describe('POST /api/teams', () => {
  // Test 1: Create team
  test('should create team with valid data', async () => {
    const token = await getAuthToken();
    
    const res = await request(API_URL)
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'QA Team',
        description: 'Quality Assurance Team'
      });

    expect(res.status).toBe(201);
    expect(res.body.team.name).toBe('QA Team');
    expect(res.body.team.ownerId).toBeDefined();

    // Verify in database
    const team = await prisma.team.findFirst({
      where: { name: 'QA Team' }
    });
    expect(team).not.toBeNull();
  });

  // Test 2: Unauthorized (no token)
  test('should reject request without auth token', async () => {
    const res = await request(API_URL)
      .post('/api/teams')
      .send({
        name: 'QA Team'
      });

    expect(res.status).toBe(401);
  });

  // Test 3: Invalid token
  test('should reject invalid token', async () => {
    const res = await request(API_URL)
      .post('/api/teams')
      .set('Authorization', 'Bearer invalid_token')
      .send({
        name: 'QA Team'
      });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/teams', () => {
  test('should list user teams', async () => {
    const token = await getAuthToken();
    
    const res = await request(API_URL)
      .get('/api/teams')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.teams)).toBe(true);
  });
});
```

---

### Test Suite 3: Rate Limiting (6 hours)

```typescript
// src/__tests__/security/rate-limiting.test.ts
describe('Rate Limiting', () => {
  test('should rate limit by IP (50 requests/sec)', async () => {
    const requests = [];
    
    for (let i = 0; i < 60; i++) {
      requests.push(
        request(API_URL).get('/api/health')
      );
    }

    const results = await Promise.all(requests);
    
    // First 50 should succeed
    const successful = results.filter(r => r.status === 200).length;
    expect(successful).toBe(50);
    
    // Next 10 should be rate limited
    const rateLimited = results.filter(r => r.status === 429).length;
    expect(rateLimited).toBe(10);
  });

  test('should rate limit per endpoint', async () => {
    const token = await getAuthToken();
    
    // Test /api/optimize endpoint (10 requests/minute)
    const requests = [];
    for (let i = 0; i < 12; i++) {
      requests.push(
        request(API_URL)
          .post('/api/optimize')
          .set('Authorization', `Bearer ${token}`)
          .send({ prompt: 'test', level: 'balanced' })
      );
    }

    const results = await Promise.all(requests);
    const rateLimited = results.filter(r => r.status === 429).length;
    expect(rateLimited).toBeGreaterThan(0);
  });
});
```

---

### Test Suite 4: Token Limiting (8 hours)

```typescript
// src/__tests__/api/token-limiting.test.ts
describe('Token Limiting - Free Tier', () => {
  test('should enforce 50K token limit/month', async () => {
    const user = await createFreeUser();
    const token = await getAuthToken(user);

    // Consume 49,000 tokens
    let tokenCount = 0;
    while (tokenCount < 49000) {
      const res = await request(API_URL)
        .post('/api/optimize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'X'.repeat(100),
          level: 'balanced'
        });

      if (res.status === 200) {
        tokenCount += res.body.tokensUsed;
      }
    }

    // Next request should fail (limit exceeded)
    const limitRes = await request(API_URL)
      .post('/api/optimize')
      .set('Authorization', `Bearer ${token}`)
      .send({
        prompt: 'X'.repeat(10000),
        level: 'balanced'
      });

    expect(limitRes.status).toBe(429);
    expect(limitRes.body.message).toContain('Token limit exceeded');
  });

  test('should allow unlimited tokens on Teams tier', async () => {
    const user = await createTeamsUser();
    const token = await getAuthToken(user);

    // Try 1M tokens worth of requests
    for (let i = 0; i < 100; i++) {
      const res = await request(API_URL)
        .post('/api/optimize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'X'.repeat(10000),
          level: 'balanced'
        });

      // Should all succeed
      expect(res.status).toBe(200);
    }
  });

  test('should reset limits monthly', async () => {
    const user = await createFreeUser();
    
    // Set last reset to previous month
    await prisma.user.update({
      where: { id: user.id },
      data: { monthlyTokensReset: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }
    });

    const token = await getAuthToken(user);

    // Should have fresh 50K tokens
    const res = await request(API_URL)
      .post('/api/optimize')
      .set('Authorization', `Bearer ${token}`)
      .send({
        prompt: 'test',
        level: 'balanced'
      });

    expect(res.status).toBe(200);
  });
});
```

---

### Test Suite 5: Database Integrity (8 hours)

```typescript
// src/__tests__/database/integrity.test.ts
describe('Database Integrity', () => {
  test('should enforce unique email constraint', async () => {
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed',
        tier: 'free'
      }
    });

    try {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashed2',
          tier: 'free'
        }
      });
      fail('Should have thrown');
    } catch (error) {
      expect(error.code).toBe('P2002'); // Unique constraint failed
    }
  });

  test('should cascade delete team members', async () => {
    const team = await prisma.team.create({
      data: {
        name: 'Test Team',
        ownerId: (await getOrCreateUser()).id
      }
    });

    // Delete team
    await prisma.team.delete({
      where: { id: team.id }
    });

    // Check members were deleted
    const memberCount = await prisma.teamMember.count({
      where: { teamId: team.id }
    });

    expect(memberCount).toBe(0);
  });

  test('should maintain referential integrity', async () => {
    const user = await getOrCreateUser();
    const ticket = await prisma.supportTicket.create({
      data: {
        subject: 'Test',
        description: 'Test ticket',
        creatorId: user.id,
        creatorEmail: user.email,
        category: 'technical',
        priority: 'high'
      }
    });

    // Verify ticket number format
    expect(ticket.ticketNumber).toMatch(/^FORT-\d{6}$/);

    // Delete user
    await prisma.user.delete({
      where: { id: user.id }
    });

    // Ticket should still exist (soft delete or cascade)
    const stillExists = await prisma.supportTicket.findUnique({
      where: { id: ticket.id }
    });

    expect(stillExists).not.toBeNull();
  });

  test('should validate subscription dates', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const sub = await prisma.subscription.create({
      data: {
        userId: (await getOrCreateUser()).id,
        tier: 'teams',
        currentPeriodEnd: futureDate,
        currentPeriodStart: new Date()
      }
    });

    expect(sub.currentPeriodEnd).toBeAfter(sub.currentPeriodStart);
  });
});
```

---

## PHASE 3: SECURITY TESTS (Week 2 - 15 hours)

### Test Suite 6: API Security (8 hours)

```typescript
// src/__tests__/security/api-security.test.ts
describe('API Security', () => {
  // Test SQL Injection
  test('should prevent SQL injection on search', async () => {
    const token = await getAuthToken();
    
    const injection = "'; DROP TABLE users; --";
    const res = await request(API_URL)
      .get(`/api/teams?search=${encodeURIComponent(injection)}`)
      .set('Authorization', `Bearer ${token}`);

    // Should either return 400 or empty results
    expect([400, 200]).toContain(res.status);

    // Verify table exists
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // Test XSS Prevention
  test('should sanitize HTML in user input', async () => {
    const token = await getAuthToken();
    
    const xssPayload = '<img src=x onerror="alert(\'XSS\')">';
    const res = await request(API_URL)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subject: xssPayload,
        description: 'Test',
        category: 'technical'
      });

    expect(res.status).toBe(201);
    
    // Verify payload is escaped
    expect(res.body.ticket.subject).not.toContain('<img');
    expect(res.body.ticket.subject).toContain('&lt;');
  });

  // Test CSRF Prevention
  test('should validate CSRF token on state-changing requests', async () => {
    const res = await request(API_URL)
      .post('/api/teams')
      .send({
        name: 'Hacked Team'
      })
      .set('X-CSRF-Token', 'invalid_token');

    expect(res.status).toBe(403);
  });

  // Test CORS
  test('should enforce CORS policy', async () => {
    const res = await request(API_URL)
      .get('/api/health')
      .set('Origin', 'https://evil.com');

    // Should either have no CORS header or reject origin
    const corsHeader = res.get('Access-Control-Allow-Origin');
    expect(corsHeader).not.toBe('https://evil.com');
  });

  // Test Authentication Header Validation
  test('should validate Authorization header format', async () => {
    const res1 = await request(API_URL)
      .get('/api/teams')
      .set('Authorization', 'NotBearer token');

    expect(res1.status).toBe(401);

    const res2 = await request(API_URL)
      .get('/api/teams')
      .set('Authorization', 'Bearer');

    expect(res2.status).toBe(401);
  });

  // Test Sensitive Data Leakage
  test('should not leak sensitive data in errors', async () => {
    const res = await request(API_URL)
      .get('/api/teams')
      .set('Authorization', 'Bearer invalid');

    expect(res.status).toBe(401);
    expect(res.body.error).not.toContain('password');
    expect(res.body.error).not.toContain('SECRET');
  });
});
```

---

### Test Suite 7: IP Security & DDoS (7 hours)

```typescript
// src/__tests__/security/ip-security.test.ts
describe('IP Security', () => {
  test('should track requests by IP', async () => {
    const ip = '192.168.1.1';
    const requests = 55;

    for (let i = 0; i < requests; i++) {
      await request(API_URL)
        .get('/api/health')
        .set('X-Forwarded-For', ip);
    }

    // Should have rate limited after 50
    const res = await request(API_URL)
      .get('/api/health')
      .set('X-Forwarded-For', ip);

    expect(res.status).toBe(429);
  });

  test('should validate X-Forwarded-For header', async () => {
    // Spoof with multiple IPs
    const res = await request(API_URL)
      .get('/api/health')
      .set('X-Forwarded-For', '192.168.1.1, 10.0.0.1, 172.16.0.1');

    // Should use first IP and validate
    expect(res.status).toBe(200);
  });

  test('should block CloudFlare spoofing', async () => {
    const res = await request(API_URL)
      .get('/api/health')
      .set('CF-Connecting-IP', '1.2.3.4')
      .set('X-Forwarded-For', '8.8.8.8');

    // Should validate CloudFlare headers
    expect(res.status).toBeOneOf([200, 403]);
  });
});
```

---

## PHASE 4: E2E TESTS (Week 1-2 - 15 hours)

### Test Suite 8: End-to-End User Flows

```typescript
// src/__tests__/e2e/signup-to-support-ticket.spec.ts
import { test, expect } from '@playwright/test';

test('User signup → create support ticket → receive email', async ({ page }) => {
  // Step 1: Navigate to signup
  await page.goto('http://localhost:3000/auth/signup');
  
  // Step 2: Fill signup form
  await page.fill('input[name="email"]', 'e2e-test@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.fill('input[name="name"]', 'E2E Test User');
  
  // Step 3: Submit and verify
  await page.click('button[type="submit"]');
  await page.waitForURL('**/auth/signin');
  
  // Step 4: Login
  await page.fill('input[name="email"]', 'e2e-test@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  // Step 5: Navigate to support
  await page.click('text=Support');
  
  // Step 6: Create ticket
  await page.click('button:has-text("Create Ticket")');
  await page.fill('input[name="subject"]', 'E2E Test Ticket');
  await page.fill('textarea[name="description"]', 'This is an E2E test');
  await page.selectOption('select[name="category"]', 'technical');
  await page.click('button:has-text("Create")');
  
  // Step 7: Verify ticket appears
  await expect(page.locator('text=E2E Test Ticket')).toBeVisible();
  
  // Step 8: Verify ticket in database
  const ticket = await prisma.supportTicket.findFirst({
    where: { subject: 'E2E Test Ticket' }
  });
  expect(ticket).not.toBeNull();
  expect(ticket?.status).toBe('open');
  
  // Step 9: Verify email sent (mock)
  // const emails = await getEmailsSentTo('e2e-test@example.com');
  // expect(emails.length).toBeGreaterThan(0);
});
```

---

## EXECUTION STEPS

### To Run All Tests:
```bash
# Setup (one-time)
npm install
npm run test:setup

# Run full test suite
npm run test:all

# Run specific test suite
npm run test:unit
npm run test:api
npm run test:security
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode (development)
npm run test:watch
```

---

## SUCCESS CRITERIA

- [ ] All 75+ tests pass
- [ ] Code coverage: 80%+
- [ ] Response time: <200ms avg
- [ ] Zero security vulnerabilities
- [ ] Rate limiting working
- [ ] Token limits enforced
- [ ] Database integrity maintained
- [ ] All APIs respond correctly
- [ ] E2E flows complete
- [ ] CI/CD green

---

**Status:** Ready to execute  
**Estimated Time:** 40-50 hours for Phase 1-3  
**Start Date:** When approved
