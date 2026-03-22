# TDD Playbook: Building Digital Products Tested From Day 1

**A 14-Council Field Manual for Shipping Production-Grade SaaS**

Authored by all 14 council personas. Based on the real build of fortress-optimizer-monorepo -- 71 spec files, 1,078 tests, 8 council reviews, 80+ bugs found and fixed across 90 commits.

---

## 1. OVERVIEW

### What This Document Is

This is a step-by-step playbook for building a new digital product using Test-Driven Development from the very first line of code. It is not theoretical. Every pattern, contract, spec, and lesson in this document was extracted from actually building, testing, breaking, and fixing a production SaaS product (Fortress Token Optimizer).

This document captures what we learned the hard way so you do not have to.

### Who It Is For

- Founders building their first SaaS product
- Engineering teams adopting TDD for the first time
- Solo developers who want production-grade quality without a QA team
- Anyone using AI-assisted development who wants to verify AI output is correct

### What "100% Tested From the Beginning" Means

It does NOT mean:
- 100% line coverage (a vanity metric)
- Every function has a unit test (that is necessary but insufficient)
- Tests pass in CI (they can pass and still be wrong)

It DOES mean:
- **Every user-facing link goes where it claims to go** (verified by clicking, not by reading source code)
- **Every CTA delivers on its promise** (the "Start Free" button actually shows a signup form)
- **Every price shown to users matches the backend** (no stale $9.99 when the API says $15)
- **Every security boundary actually blocks unauthorized access** (tested with forged tokens, not just missing tokens)
- **Every flow works end-to-end** (signup -> dashboard -> upgrade -> billing, not just each page in isolation)
- **Every council review finding is verified with a regression test** (fixes do not regress)

The test suite is a living specification of what your product does. If someone deleted all your documentation, the tests alone should tell them exactly how the product behaves.

---

## 2. PHASE ORDER (Build In This Exact Sequence)

### Phase 0: Foundation (Before Writing Any Product Code)

**Goal:** Establish the testing infrastructure so every line of product code you write has somewhere to be tested immediately.

#### What to Set Up First

1. **Monorepo structure** with clear boundaries:
   ```
   your-product/
   ├── backend/           # API server
   ├── website/            # Frontend + marketing
   │   ├── src/
   │   ├── qa-system/
   │   │   ├── contracts/  # JSON truth files
   │   │   ├── specs/      # Test spec files
   │   │   ├── shared/     # Fixtures, helpers, contract loaders
   │   │   └── product-agents/  # Product-specific test agents
   │   └── tests/
   │       └── e2e/        # User journey specs
   ├── products/           # SDKs, integrations
   ├── shared-libs/        # Shared types and utilities
   └── package.json
   ```

2. **Testing framework selection** -- pick ONE and commit:
   - **Playwright** for anything that touches a browser (navigation, forms, visual regression, accessibility)
   - **Vitest/Jest** for pure unit tests (utilities, algorithms, data transformations)
   - **Playwright `request` context** for API contract testing (no browser needed, fast)

3. **Contract files** -- create these EMPTY but with correct schema:
   - `qa-system/contracts/site.contract.json` -- every link on your site
   - `qa-system/contracts/pages.contract.json` -- every route
   - `qa-system/contracts/flows.contract.json` -- every user journey
   - `qa-system/contracts/slo.contract.json` -- every SLO target
   - `products/qa-system/contracts/api.contract.json` -- every API endpoint

4. **Shared test infrastructure:**
   - Contract loader utility (reads JSON contracts and generates test cases)
   - Evidence collector fixture (captures console errors, network failures, screenshots on failure)
   - Auth helper (creates test users, logs in, returns tokens)

#### Testing Infrastructure Decisions

Make these decisions on Day 1 and document them. Changing later is expensive.

| Decision | Recommendation | Why |
|----------|---------------|-----|
| Browser testing | Playwright | Built-in API testing, trace viewer, multi-browser |
| Test runner | Playwright Test | Parallel execution, projects, retries |
| Assertion library | Playwright's `expect` | Auto-retrying, async-aware |
| CI provider | GitHub Actions | Free for public repos, easy YAML |
| Contract format | JSON | Parseable, diffable, no code in contracts |
| Test data | Generated per run | `Date.now().toString(36)` suffix for uniqueness |
| Secrets | Environment variables | Never hardcode, crash if missing in production |

#### CI/CD Pipeline Skeleton

Create this on Day 1, even before you have any tests:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=qa-canary

  full:
    runs-on: ubuntu-latest
    needs: smoke
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=qa-system
```

**Playwright config pattern** -- use projects to organize test tiers:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Fast canary smoke (< 30 seconds)
    { name: 'qa-canary', testDir: './qa-system/specs', testMatch: '28-canary-smoke.spec.ts', timeout: 30000 },
    // Navigation contract verification
    { name: 'qa-navigation', testDir: './qa-system/specs', testMatch: '01-navigation.spec.ts', timeout: 30000 },
    // Full exhaustive suite
    { name: 'qa-system', testDir: './qa-system/specs', testMatch: '*.spec.ts', timeout: 120000 },
    // Load testing (weekly)
    { name: 'qa-sustained-load', testDir: './qa-system/specs', testMatch: '37-sustained-load.spec.ts', timeout: 300000 },
  ],
});
```

**Phase 0 deliverables:**
- [ ] Monorepo structure created
- [ ] Playwright installed and configured
- [ ] Empty contract files created with correct schemas
- [ ] Contract loader utility written
- [ ] Evidence collector fixture written
- [ ] CI pipeline runs (even if it has zero tests)
- [ ] `qa-canary` project defined in playwright.config.ts

---

### Phase 1: Authentication & Security (Build + Test First)

**Why auth comes first:** Every subsequent test (billing, dashboards, API calls) needs authenticated users. If you build auth last, you cannot test anything else realistically. You also cannot test security if there is nothing to secure.

#### What to Test BEFORE Writing Auth Code (Red Phase)

Write these tests first. They will all fail. That is the point.

```typescript
// 1. Signup creates a user and returns confirmation (not token in body)
test('POST /api/auth/signup creates user', async () => {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'SecureP@ss1!', name: 'Test' }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.user).toBeTruthy();
  expect(data.token).toBeUndefined(); // Token goes in cookie, NOT body
});

// 2. Login sets HttpOnly cookie
test('POST /api/auth/login sets HttpOnly cookie', async () => {
  const res = await fetch(`${BASE}/api/auth/login`, { /* ... */ });
  const setCookie = res.headers.get('set-cookie') || '';
  expect(setCookie.toLowerCase()).toContain('httponly');
  expect(setCookie.toLowerCase()).toMatch(/samesite=(strict|lax)/);
});

// 3. Forged JWT is rejected
test('Forged JWT with wrong secret is rejected', async ({ page }) => {
  const forgedToken = sign({ id: 'attacker' }, 'wrong-secret', { expiresIn: '24h' });
  await page.context().addCookies([{
    name: 'auth_token', value: forgedToken, domain: 'localhost', path: '/',
  }]);
  await page.goto('/account');
  expect(page.url()).toContain('/auth/login'); // Redirected
});

// 4. Expired JWT is rejected
test('Expired JWT is rejected', async ({ page }) => {
  const expiredToken = sign({ id: 'expired' }, SECRET, { expiresIn: '-1h' });
  // ... same pattern, verify redirect to login
});

// 5. Base64 blob (not JWT) is rejected
test('Non-JWT cookie is rejected', async ({ page }) => {
  const fake = Buffer.from(JSON.stringify({ id: 'fake', role: 'admin' })).toString('base64');
  // ... same pattern
});
```

#### Security Tests to Write BEFORE Writing Auth Code

These protect against the mistakes you will make:

1. **Token in response body** -- if the token is in the JSON response (not just the cookie), it can be leaked via XSS
2. **Missing HttpOnly** -- if the cookie is readable by JavaScript, XSS can steal sessions
3. **Missing SameSite** -- CSRF attacks
4. **Hardcoded JWT secret** -- the #1 real bug we found; production MUST crash if using a default secret
5. **Password reset always returns 200** -- never reveal whether an email exists in your system

```typescript
// This test saved us from shipping a hardcoded secret to production
test('JWT_SECRET env var is not the default', async () => {
  // Source code verification: the server must crash if JWT_SECRET is default
  const authCode = readFileSync('path/to/auth/handler.ts', 'utf-8');
  expect(authCode).toContain('throw'); // Must throw, not console.error
  expect(authCode).not.toContain("console.error('WARNING");
});
```

#### Red -> Green -> Refactor Cycle

1. **RED:** Write all 5+ security tests above. Run them. They all fail.
2. **GREEN:** Implement auth endpoint by endpoint until each test passes. Do not write code that no test exercises.
3. **REFACTOR:** Extract shared auth helpers (`createAuthenticatedUser()`, `authHeaders(token)`). These will be used by 50+ tests later.

**Phase 1 deliverables:**
- [ ] Signup API tested and working
- [ ] Login API tested, sets HttpOnly cookie
- [ ] JWT validation middleware tested with forged/expired/malformed tokens
- [ ] Password reset tested (always returns 200)
- [ ] Auth helper functions extracted for reuse
- [ ] pages.contract.json updated with auth routes (/auth/login, /auth/signup)
- [ ] Expected test count: 15-25 tests

---

### Phase 2: Core Product (The Thing That Delivers Value)

**Goal:** TDD the core algorithm or service that makes your product worth paying for.

#### TDD the Core Algorithm/Service

For a prompt optimizer, this means the optimize endpoint. For a CRM, this means contact management. For an analytics tool, this means data ingestion and querying.

Write the API contract FIRST:

```json
// api.contract.json
{
  "endpoints": {
    "optimize": {
      "method": "POST",
      "path": "/api/optimize",
      "auth": true,
      "expectedStatus": 200,
      "requestSchema": {
        "required": ["prompt"],
        "optional": ["level", "provider"]
      },
      "responseSchema": {
        "required": ["request_id", "status", "optimization", "tokens", "timestamp"]
      }
    }
  }
}
```

Then write contract tests:

```typescript
test('Optimize endpoint returns all required fields', async () => {
  const res = await fetch(`${API_BASE}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testApiKey}` },
    body: JSON.stringify({ prompt: 'Test prompt', level: 'balanced' }),
  });
  const data = await res.json();
  for (const field of ['request_id', 'status', 'optimization', 'tokens', 'timestamp']) {
    expect(data).toHaveProperty(field);
  }
});
```

#### Accuracy/Quality Tests

These are unique to TDD for products -- not just "does it work" but "does it deliver what it promises":

```typescript
test('Verbose prompt produces actual token savings (savings > 0)', async () => {
  const res = await fetch(`${API_BASE}/api/optimize`, { /* ... */ });
  const data = await res.json();
  expect(data.tokens.savings).toBeGreaterThan(0);
});

test('Savings percentage is in reasonable range (5-40%)', async () => {
  // If your product claims 20% savings, test that it actually delivers
  expect(data.tokens.savings_percentage).toBeGreaterThanOrEqual(5);
  expect(data.tokens.savings_percentage).toBeLessThanOrEqual(40);
});

test('Optimized output is actually shorter than original', async () => {
  expect(data.tokens.optimized).toBeLessThan(data.tokens.original);
});
```

**Phase 2 deliverables:**
- [ ] api.contract.json fully specified
- [ ] API contract tests passing (schema validation)
- [ ] Integration tests against live API
- [ ] Accuracy/quality tests verifying product promises
- [ ] Rate limit tests
- [ ] Error handling tests (bad input, missing fields, oversized input)
- [ ] Expected test count: 30-50 tests

---

### Phase 3: Website & Marketing (Public-Facing Pages)

**Goal:** Every page exists, every link works, every CTA delivers on its promise.

#### Contract-Driven Testing (site.contract.json Pattern)

This is the single most valuable pattern in the entire playbook. Instead of writing individual navigation tests, you define a contract and generate tests from it:

```json
// site.contract.json
{
  "links": [
    {
      "id": "nav-pricing",
      "source": "/",
      "selector": "nav >> a:has-text('Pricing')",
      "expectedDestination": "/pricing",
      "pageMarker": "body",
      "priority": "critical",
      "category": "navigation",
      "authRequired": false
    },
    {
      "id": "home-cta-signup",
      "source": "/",
      "selector": "a[href='/auth/signup']",
      "expectedDestination": "/auth/signup",
      "pageMarker": "input[name='email']",
      "priority": "critical",
      "category": "cta",
      "authRequired": false
    }
  ]
}
```

The contract loader generates tests dynamically:

```typescript
const allLinks = generateLinkTests({ authRequired: false });
for (const link of allLinks) {
  test(`[${link.priority}] ${link.id}: ${link.source} -> ${link.expectedDestination}`, async ({ page }) => {
    await page.goto(`${BASE}${link.source}`);
    const element = page.locator(link.selector);
    await element.click();
    await expect(page).toHaveURL(new RegExp(link.expectedDestination));
    if (link.pageMarker) {
      await expect(page.locator(link.pageMarker)).toBeVisible();
    }
  });
}
```

One contract, 55 links, 55 tests generated automatically. Add a new page? Add one line to the contract. The test is created for you.

#### Navigation, Intent, Destination Verification

Three layers of testing, each catching different bugs:

| Layer | What It Tests | Example Bug It Catches |
|-------|--------------|----------------------|
| Navigation | Link exists and is clickable | Dead link, 404 page |
| Intent | CTA delivers on its promise | "Start Free" goes to paid page |
| Destination | Arrival page has expected content | Link goes to right URL but page is empty |

**Intent tests are critical.** A navigation test says "the link goes to /auth/signup." An intent test says "the user who clicked 'Start Free' sees a signup form with an email field, a password field, and a name field."

```typescript
test('"Join Early Access" delivers a signup form with email field', async ({ page }) => {
  await page.goto(BASE);
  const cta = page.locator('a[href="/auth/signup"]').first();
  await cta.click();
  await expect(page).toHaveURL(/\/auth\/signup/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('input[name="firstName"]')).toBeVisible();
});
```

#### SEO, Accessibility, Visual Regression

These are not afterthoughts. They are Phase 3 deliverables.

**SEO tests** -- verify from the contract:

```typescript
for (const route of routes) {
  test(`${route.path} title contains "${route.expectedTitle}"`, async ({ request }) => {
    const resp = await request.get(`${BASE}${route.path}`);
    const html = await resp.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    expect(titleMatch![1].toLowerCase()).toContain(route.expectedTitle.toLowerCase());
  });
}
```

**Accessibility tests** -- axe-core integration:

```typescript
test('Homepage passes axe-core accessibility audit', async ({ page }) => {
  await page.goto(BASE);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
```

**Content freshness** -- verify frontend matches backend:

```typescript
test('Pricing page Pro amount matches /api/pricing response', async ({ page }) => {
  const apiData = await (await fetch(`${API_BASE}/api/pricing`)).json();
  await page.goto(`${BASE}/pricing`);
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toContain('$15'); // Must match backend
});
```

**Phase 3 deliverables:**
- [ ] site.contract.json with every link
- [ ] pages.contract.json with every route
- [ ] Navigation spec passing for all links
- [ ] Intent spec verifying CTA promises
- [ ] SEO meta tests (titles, descriptions, OG tags)
- [ ] Accessibility audit passing
- [ ] Content freshness tests (frontend matches backend)
- [ ] Visual regression baselines captured
- [ ] Mobile responsive tests at 375px, 768px, 1024px
- [ ] Expected test count: 80-120 tests

---

### Phase 4: Billing & Subscriptions

**Goal:** TDD Stripe integration so no user is ever charged incorrectly, and no free user accesses paid features.

#### Stripe Integration TDD

```typescript
test('POST /api/subscriptions creates checkout for individual tier', async () => {
  const user = await createAuthenticatedUser();
  const res = await fetch(`${BASE}/api/subscriptions`, {
    method: 'POST',
    headers: authHeaders(user.token),
    body: JSON.stringify({
      tier: 'individual',
      successUrl: `${BASE}/dashboard?upgrade=success`,
      cancelUrl: `${BASE}/pricing?upgrade=cancelled`,
    }),
  });
  if (res.ok) {
    const data = await res.json();
    expect(data.url || data.sessionId || data.checkout_url).toBeTruthy();
  } else {
    expect(res.status).not.toBe(500); // Stripe not configured is OK, 500 is not
  }
});
```

#### Webhook Handler Tests

```typescript
test('Webhook rejects invalid signature', async () => {
  const res = await fetch(`${BASE}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'stripe-signature': 'invalid', 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'checkout.session.completed' }),
  });
  expect(res.status).toBe(400);
});

test('Webhook handles duplicate delivery (idempotent)', async () => {
  const eventId = `evt_test_${Date.now()}`;
  // Send same event twice
  const res1 = await sendWebhookEvent(eventId);
  const res2 = await sendWebhookEvent(eventId);
  // Second should succeed (idempotent) or return 200/409
  expect([200, 409]).toContain(res2.status);
});
```

#### Pricing Consistency Tests

This is where we found multiple bugs. The pricing page said $9.99, the backend said $15, and the Stripe checkout used $15. The user sees one price and pays another -- a potential legal issue.

```typescript
test('[PRICE-1] Pricing page source has $15 Pro', async () => {
  const pricingClient = readFileSync('src/app/pricing/client.tsx', 'utf-8');
  expect(pricingClient).toContain("'15'");
  expect(pricingClient).not.toContain('9.99'); // Old price must be gone
});

test('Annual toggle actually changes Stripe checkout price (not just display)', async () => {
  // Toggle to annual, click subscribe, verify Stripe session uses annual price
  // NOT just a visual change
});
```

**Phase 4 deliverables:**
- [ ] Checkout session creation tests
- [ ] Webhook handler tests (valid, invalid, duplicate, out-of-order)
- [ ] Subscription lifecycle tests (create, upgrade, downgrade, cancel)
- [ ] Pricing consistency tests (frontend = backend = Stripe)
- [ ] RBAC tier enforcement tests (free cannot access pro features)
- [ ] Annual/monthly toggle actually changes checkout price
- [ ] Expected test count: 20-35 tests

---

### Phase 5: User Journeys (Multi-Step Flows)

**Goal:** Verify that complete user paths work end-to-end, not just individual pages.

#### Flow Contract Pattern (flows.contract.json)

```json
{
  "flows": [
    {
      "id": "individual-pro-signup-unauth",
      "name": "Pricing Pro -> Signup (NOT Login)",
      "priority": "critical",
      "steps": [
        { "action": "navigate", "url": "/pricing" },
        { "action": "wait", "forSelector": "button:has-text('Subscribe now')" },
        { "action": "click", "selector": "button:has-text('Subscribe now')", "expectedUrl": "/auth/signup" },
        { "action": "assert", "type": "url", "value": "/auth/signup" },
        { "action": "assert", "type": "url-not", "value": "/auth/login" },
        { "action": "assert", "type": "visible", "selector": "input[name='email']" }
      ]
    }
  ]
}
```

**Key insight from fortress-optimizer:** Unauthenticated users clicking "Subscribe" on the pricing page were sent to `/auth/login` instead of `/auth/signup`. A user who has never created an account cannot log in. This flow test caught it.

#### Post-Action Destination Verification

After every important action, verify WHERE the user ends up:

```typescript
test('After signup, user lands on dashboard (not login page again)', async () => {
  // Complete signup flow
  // Verify: page.url() contains '/dashboard'
  // NOT '/auth/login' (which would create an infinite redirect loop)
});

test('After upgrading, user returns to pricing (not homepage)', async () => {
  // Use callbackUrl parameter
  // Verify redirect back to the page they were on
});
```

**Phase 5 deliverables:**
- [ ] flows.contract.json with all critical user journeys
- [ ] Flow crawler spec that executes every flow
- [ ] Post-action destination tests for every major action
- [ ] Cross-page state preservation tests (e.g., callbackUrl works)
- [ ] Expected test count: 20-30 tests

---

### Phase 6: Operations & Infrastructure

**Goal:** Verify that your infrastructure is not just deployed but actually healthy and observable.

#### Health Check Tests

```typescript
test('Backend /health returns DB + Redis + Sentry status', async () => {
  const res = await fetch(`${API_BASE}/health`);
  const data = await res.json();
  expect(data).toHaveProperty('database');
  expect(data).toHaveProperty('status');
  expect(data.database).toBe('connected');
});

test('Health returns 503 when DB is degraded (source check)', async () => {
  const mainPy = readFileSync('backend/main.py', 'utf-8');
  expect(mainPy).toContain('503');
  expect(mainPy).toContain('degraded');
});
```

#### Deployment Safety Tests (Canary Smoke)

These run after every deploy. Under 30 seconds total. If ANY fail, the deploy is broken.

```typescript
test('Homepage returns 200', async () => { /* ... */ });
test('Website /api/health returns healthy', async () => { /* ... */ });
test('Backend /health returns healthy', async () => { /* ... */ });
test('Login page renders form', async ({ page }) => { /* ... */ });
test('Pricing page renders tiers', async ({ page }) => { /* ... */ });
```

#### Monitoring Verification

Test that your observability infrastructure is wired up, not just installed:

```typescript
test('Backend uses JSONFormatter for structured logs', async () => {
  const mainPy = readFileSync('backend/main.py', 'utf-8');
  expect(mainPy).toContain('class JSONFormatter');
  expect(mainPy).toContain('"timestamp"');
  expect(mainPy).toContain('"level"');
});

test('Error handler logs request_id + stack trace', async () => {
  const mainPy = readFileSync('backend/main.py', 'utf-8');
  expect(mainPy).toMatch(/general_exception_handler[\s\S]*request_id/);
});
```

**Phase 6 deliverables:**
- [ ] Health endpoint tests (all dependencies reported)
- [ ] Canary smoke tests (< 30 seconds)
- [ ] Structured logging verification
- [ ] Error handling tests (request_id, no stack traces leaked to client)
- [ ] Graceful shutdown test
- [ ] Expected test count: 15-25 tests

---

### Phase 7: Support & Customer Service

**Goal:** Verify the entire ticket lifecycle works, emails do not crash the system, and no user can see another user's tickets.

#### Ticket System Tests

```typescript
test('Create ticket returns UUID-based ticket number', async () => {
  const user = await createAuthUser();
  const res = await fetch(`${BASE}/api/support/tickets`, {
    method: 'POST',
    headers: authHeaders(user.cookie),
    body: JSON.stringify({ subject: 'Test', description: 'Test', category: 'technical' }),
  });
  const data = await res.json();
  expect(data.ticketNumber).toMatch(/^FORT-[A-Z0-9]{8}$/);
});

test('User A cannot see User B tickets (isolation)', async () => {
  const userA = await createAuthUser();
  const userB = await createAuthUser();
  // Create ticket as User A
  // Try to read it as User B -> must fail
});
```

#### Email Delivery Verification

```typescript
test('Password reset always returns 200 (no email enumeration)', async () => {
  const res = await fetch(`${BASE}/api/password/request-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@test.example.com' }),
  });
  expect(res.status).toBe(200); // ALWAYS 200, never reveal if email exists
});
```

**Phase 7 deliverables:**
- [ ] Ticket CRUD lifecycle tests
- [ ] Ticket isolation tests (multi-tenant)
- [ ] Email trigger tests (password reset, welcome, ticket confirmation)
- [ ] Rate limiting on support endpoints
- [ ] XSS in ticket content is sanitized
- [ ] Expected test count: 10-20 tests

---

### Phase 8: Load & Performance

**Goal:** Know your breaking point BEFORE your users find it.

#### Burst Tests (10x, 100x)

```typescript
test('10x burst: 10 concurrent requests to homepage', async () => {
  const promises = Array.from({ length: 10 }, () => fetch(BASE));
  const results = await Promise.all(promises);
  const statuses = results.map(r => r.status);
  expect(statuses.filter(s => s === 200).length).toBeGreaterThanOrEqual(9);
});
```

#### Sustained Load Tests

```typescript
test('Sustained API traffic: zero 500 errors over 30 seconds', async () => {
  const results = [];
  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    const res = await fetch(`${API_BASE}/api/optimize`, { /* ... */ });
    results.push({ status: res.status, elapsed: performance.now() - reqStart });
    await new Promise(r => setTimeout(r, 333)); // ~3 RPS
  }
  const errors500 = results.filter(r => r.status >= 500);
  expect(errors500.length).toBe(0);
});
```

#### SLO Enforcement

Use `slo.contract.json` to enforce response time budgets:

```json
{
  "endpoints": [
    { "url": "/health", "method": "GET", "p95": 500, "p99": 1000 },
    { "url": "/api/optimize", "method": "POST", "p95": 1500, "p99": 2000, "requiresAuth": true }
  ]
}
```

```typescript
test('Health endpoint P95 < 500ms', async () => {
  const times = await measureLatency(`${API_BASE}/health`, 'GET', 20);
  const p95 = percentile(times.sort((a, b) => a - b), 95);
  expect(p95).toBeLessThan(500);
});
```

**Phase 8 deliverables:**
- [ ] slo.contract.json with all endpoints and targets
- [ ] Burst tests at 10x and 100x
- [ ] Sustained load test (30-60 seconds continuous)
- [ ] SLO enforcement tests (P95, P99 per endpoint)
- [ ] Latency drift detection (P95 over time window)
- [ ] Expected test count: 10-20 tests

---

### Phase 9: Security Hardening

**Goal:** Systematically probe every attack surface. Not just "does auth work" but "can it be broken."

#### Fuzz Testing

```typescript
test('Script tag in signup name field is rejected or escaped', async () => {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'xss@test.com',
      password: 'SecureP@ss1!',
      name: '<script>alert("xss")</script>',
    }),
  });
  expect(res.status).not.toBe(500);
  const body = await res.text();
  expect(body).not.toContain('<script>');
});

test('SQL injection in email field', async () => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: "admin'--",
      password: 'anything',
    }),
  });
  expect(res.status).not.toBe(500); // Must not crash
});
```

#### Attack Chain Tests

Single-input fuzzing is insufficient. Real attackers chain multiple steps:

```typescript
test('Forged JWT with wrong secret -> rejected on protected route', async ({ page }) => {
  const forgedToken = sign({ id: 'attacker', email: 'attacker@evil.com' }, 'wrong-secret');
  await page.context().addCookies([{
    name: 'auth_token', value: forgedToken, domain: new URL(BASE).hostname, path: '/',
  }]);
  await page.goto(`${BASE}/account`);
  expect(page.url()).toContain('/auth/login');
});

test('Free user cannot access admin cleanup endpoint', async () => {
  const res = await fetch(`${API_BASE}/api/admin/cleanup`, { method: 'POST' });
  expect(res.status).toBe(403);
});
```

#### Cookie Security

```typescript
test('Auth cookie has HttpOnly flag', async () => {
  const { setCookie } = await loginAndGetCookies();
  expect(setCookie.toLowerCase()).toContain('httponly');
});

test('Auth cookie has Secure flag (HTTPS)', async () => {
  const { setCookie } = await loginAndGetCookies();
  if (BASE.startsWith('https://')) {
    expect(setCookie.toLowerCase()).toContain('secure');
  }
});

test('Auth cookie has SameSite=Strict or Lax', async () => {
  const { setCookie } = await loginAndGetCookies();
  expect(setCookie.toLowerCase()).toMatch(/samesite=(strict|lax)/);
});
```

**Phase 9 deliverables:**
- [ ] XSS fuzzing on all input fields
- [ ] SQL injection fuzzing on all input fields
- [ ] JWT forgery tests (wrong secret, expired, malformed)
- [ ] Privilege escalation tests (free -> admin)
- [ ] Cookie flag verification (HttpOnly, Secure, SameSite)
- [ ] CSRF protection verification
- [ ] Source code verification (no x-user-context, no hardcoded secrets)
- [ ] Expected test count: 25-40 tests

---

### Phase 10: Council Reviews

**Goal:** Bring in domain experts to find bugs that automated tests miss.

#### When to Run Council Reviews

| Council | When | What They Look For |
|---------|------|-------------------|
| Security | After Phase 1 + Phase 9 | Auth bypass, injection, secret management |
| UX/Product | After Phase 3 | Broken flows, misleading CTAs, accessibility |
| Business | After Phase 4 | Pricing inconsistencies, billing bugs, conversion killers |
| Operations | After Phase 6 | Health checks, logging, graceful degradation |
| Product SDK | After Phase 2 SDKs | API contract violations, SDK reliability |

#### What Each Council Evaluates

**Security Council:**
- Are tokens properly signed JWTs (not base64)?
- Does middleware validate JWT signature (not just cookie presence)?
- Is the JWT secret hardcoded or configurable?
- Are admin endpoints protected?
- Is x-user-context or similar trust-the-client patterns used anywhere?

**Business Council:**
- Do all price surfaces show the same number? (pricing page, API, Stripe, emails)
- Does annual billing actually change the Stripe checkout, or is it visual-only?
- Does the seat calculator match the breakdown table?
- Are fabricated stats on the homepage? ("Join 10,000+ developers" when you have 3 users)

**UX Council:**
- Does every CTA go where a reasonable user expects?
- Do unauthenticated users clicking "Subscribe" go to signup (not login)?
- Is the upgrade flow smooth, or does it redirect to login for already-authenticated users?
- Are error messages actionable?

**Operations Council:**
- Does /health report all dependency statuses?
- Are logs structured JSON with request_id?
- Is there a graceful shutdown handler?
- Are cron jobs idempotent?

#### How to Process Findings

Every council finding becomes a test. This is non-negotiable.

1. Council finds bug: "Pricing page shows $9.99, backend says $15"
2. Write test that verifies the fix: `expect(pricingPage).toContain('$15')`
3. Fix the bug
4. Test passes
5. Test stays in the suite forever (regression test)

We created two dedicated spec files for this:
- `30-council-fixes.spec.ts` -- 40 tests across Security, Service/Ops, UX, SDK, and Infrastructure
- `32-business-council-fixes.spec.ts` -- 27 tests across Pricing, Signup flows, Install, Billing, and Enterprise

**Phase 10 deliverables:**
- [ ] All council reviews completed
- [ ] Every finding has a corresponding test
- [ ] council-fixes.spec.ts passing
- [ ] business-council-fixes.spec.ts passing
- [ ] Expected test count: 40-70 tests (regression from findings)

---

## 3. TEST CATEGORIES (Complete Taxonomy)

### 1. Unit Tests

- **What it tests:** Individual functions, utilities, data transformations in isolation
- **When to write it:** Phase 0-2 (as you build utilities)
- **Example pattern:**
  ```typescript
  test('calculateTeamPrice returns correct price for 50 seats', () => {
    expect(calculateTeamPrice(50)).toBe(400);
  });
  ```
- **Common pitfalls:** Testing implementation details instead of behavior; mocking everything so the test only verifies your mocks
- **Typical count:** 20-50

### 2. API Contract Tests

- **What it tests:** Every API endpoint returns the correct status code, has required fields, matches the documented schema
- **When to write it:** Phase 2 (core product)
- **Example pattern:**
  ```typescript
  test('POST /api/optimize returns required fields', async () => {
    const data = await callOptimize(validPayload);
    for (const field of contract.responseSchema.required) {
      expect(data).toHaveProperty(field);
    }
  });
  ```
- **Common pitfalls:** Testing only the happy path; forgetting to test error responses (400, 401, 403, 429, 500)
- **Typical count:** 15-30

### 3. Integration Tests (Live API)

- **What it tests:** Real HTTP calls to running services, not mocks
- **When to write it:** Phase 2
- **Example pattern:** Create a real API key, make a real optimize call, verify real savings
- **Common pitfalls:** Tests that only work with mocks give false confidence. If you mock Stripe, you never test Stripe.
- **Typical count:** 10-20

### 4. Navigation/Link Tests

- **What it tests:** Every link on the site goes to the correct destination
- **When to write it:** Phase 3
- **Example pattern:** Contract-driven -- loop through site.contract.json and click every link
- **Common pitfalls:** Testing `href` attribute without clicking. A link can have `href="/pricing"` but JavaScript prevents default and does nothing.
- **Typical count:** 40-60 (generated from contract)

### 5. Intent/CTA Tests

- **What it tests:** The user gets what the CTA promised, not just a page load
- **When to write it:** Phase 3
- **Example pattern:** "Start Free" -> verify signup form with email, password, and name fields
- **Common pitfalls:** Verifying URL only. The URL can be correct but the page can be empty, broken, or show an error.
- **Typical count:** 10-20

### 6. Accessibility Tests

- **What it tests:** ARIA labels, color contrast, keyboard navigation, screen reader compatibility
- **When to write it:** Phase 3
- **Example pattern:** axe-core integration on every page
- **Common pitfalls:** Running axe-core only on the homepage. Every page needs it.
- **Typical count:** 10-30

### 7. Visual Regression Tests

- **What it tests:** Screenshots match baselines pixel-by-pixel (with tolerance)
- **When to write it:** Phase 3
- **Example pattern:** `await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixelRatio: 0.01 })`
- **Common pitfalls:** Dynamic content (timestamps, user names) causes false positives. Mask dynamic areas.
- **Typical count:** 5-15

### 8. Mobile/Responsive Tests

- **What it tests:** Pages render correctly at mobile (375px), tablet (768px), desktop (1024px+) widths
- **When to write it:** Phase 3
- **Example pattern:** Set viewport, verify no horizontal scroll, verify nav collapses to burger menu
- **Common pitfalls:** Testing only one breakpoint. A bug at 768px will not show at 375px.
- **Typical count:** 10-20

### 9. SEO/Meta Tests

- **What it tests:** Title tags, meta descriptions, OG tags, sitemap, robots.txt, canonical URLs
- **When to write it:** Phase 3
- **Example pattern:**
  ```typescript
  test('Every page has a title containing brand name', async ({ request }) => {
    for (const route of routes) {
      const html = await (await request.get(route.path)).text();
      expect(html).toMatch(/<title>.*YourBrand.*<\/title>/i);
    }
  });
  ```
- **Common pitfalls:** Checking only the homepage. Inner pages often have missing or duplicate titles.
- **Typical count:** 10-20

### 10. Security Surface Tests

- **What it tests:** Auth headers, cookie flags, CORS, CSP, X-Frame-Options
- **When to write it:** Phase 1 + Phase 9
- **Example pattern:** Verify response headers on every endpoint
- **Common pitfalls:** Checking source code but not live headers. Code can set headers but middleware can strip them.
- **Typical count:** 10-20

### 11. Fuzz/Injection Tests

- **What it tests:** XSS, SQLi, CRLF injection, null bytes, Unicode overflows, prototype pollution
- **When to write it:** Phase 9
- **Example pattern:** Submit `<script>alert(1)</script>` in every input field
- **Common pitfalls:** Only testing one payload. Attackers have hundreds of variants.
- **Typical count:** 15-25

### 12. Form Validation Tests

- **What it tests:** Required fields, email format, password strength, field length limits
- **When to write it:** Phase 1 (auth forms), Phase 3 (all forms)
- **Example pattern:** Submit empty form, verify error messages appear
- **Common pitfalls:** Testing only client-side validation. Always test server-side too.
- **Typical count:** 10-20

### 13. Flow/Journey Tests

- **What it tests:** Multi-page user paths from start to finish
- **When to write it:** Phase 5
- **Example pattern:** Homepage -> Pricing -> Subscribe -> Signup -> Dashboard
- **Common pitfalls:** Testing each page in isolation. Bugs often live in the transitions.
- **Typical count:** 10-15

### 14. Post-Action Destination Tests

- **What it tests:** After performing an action, the user ends up in the right place
- **When to write it:** Phase 5
- **Example pattern:** After login with callbackUrl=/pricing, user lands on /pricing
- **Common pitfalls:** Not testing callbackUrl, returnTo, or redirect parameters
- **Typical count:** 10-20

### 15. Performance/Load Tests

- **What it tests:** Response times under concurrent load
- **When to write it:** Phase 8
- **Example pattern:** 10x/100x burst tests, sustained 30-second load
- **Common pitfalls:** Running load tests from the same machine as the server
- **Typical count:** 5-10

### 16. SLO Enforcement Tests

- **What it tests:** P95/P99 latency against documented targets
- **When to write it:** Phase 8
- **Example pattern:** 20 samples per endpoint, verify percentile targets from slo.contract.json
- **Common pitfalls:** Setting unrealistic targets (50ms for database queries). Set targets based on measurement, then enforce.
- **Typical count:** 5-10

### 17. Webhook Resilience Tests

- **What it tests:** Webhook handlers reject invalid signatures, handle duplicates, do not crash on unknown events
- **When to write it:** Phase 4
- **Example pattern:** Send malformed webhook, verify 400 response
- **Common pitfalls:** Only testing the happy path. Stripe will send events you did not expect.
- **Typical count:** 5-10

### 18. Email Delivery Tests

- **What it tests:** Email-triggering endpoints return correct status codes, do not crash, do not leak whether email exists
- **When to write it:** Phase 7
- **Example pattern:** Password reset for nonexistent email returns 200 (not 404)
- **Common pitfalls:** Cannot test actual email delivery without a test inbox provider (e.g., Resend test mode)
- **Typical count:** 5-10

### 19. Billing Lifecycle Tests

- **What it tests:** Create subscription, upgrade, downgrade, cancel, reactivate
- **When to write it:** Phase 4
- **Example pattern:** Create checkout session, verify Stripe session parameters
- **Common pitfalls:** Using Stripe test mode but never testing with real cards before launch
- **Typical count:** 10-15

### 20. RBAC/Tier Enforcement Tests

- **What it tests:** Free users cannot access paid features, paid users get what they paid for
- **When to write it:** Phase 4
- **Example pattern:**
  ```typescript
  test('Unauthenticated user cannot access /api/subscriptions', async () => {
    const res = await fetch(`${BASE}/api/subscriptions`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
  ```
- **Common pitfalls:** Only testing that paid features work for paid users. Must also test that they are blocked for free users.
- **Typical count:** 10-15

### 21. Content Freshness Tests

- **What it tests:** Frontend content matches backend data, copyright year is current, no stale messaging
- **When to write it:** Phase 3
- **Example pattern:** Backend says Pro is $15, frontend must show $15
- **Common pitfalls:** Hardcoding expected values in tests instead of reading from the API
- **Typical count:** 5-10

### 22. Cross-Browser Tests

- **What it tests:** Site works in Chromium, Firefox, WebKit
- **When to write it:** Phase 3
- **Example pattern:** Run canary smoke in all three browsers
- **Common pitfalls:** Running full suite in all browsers (too slow). Run canary + critical flows only.
- **Typical count:** 5-10

### 23. Cookie/Session Tests

- **What it tests:** Cookie flags, session expiry, token refresh, logout clears cookies
- **When to write it:** Phase 1 + Phase 9
- **Example pattern:** Verify HttpOnly, Secure, SameSite flags on auth cookie
- **Common pitfalls:** Testing cookie presence but not cookie flags
- **Typical count:** 5-10

### 24. Attack Chain Tests

- **What it tests:** Multi-step exploits that chain authentication bypass, privilege escalation, and data exfiltration
- **When to write it:** Phase 9
- **Example pattern:** Forge JWT -> access admin endpoint -> attempt data export
- **Common pitfalls:** Only testing single-step attacks. Real attackers chain steps.
- **Typical count:** 5-10

### 25. Database Migration Tests

- **What it tests:** Schema files are valid, migrations exist, Prisma client generates successfully
- **When to write it:** Phase 6
- **Example pattern:**
  ```typescript
  test('Prisma schema file exists and is valid syntax', async () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf-8');
    expect(schema).toContain('model User');
  });
  ```
- **Common pitfalls:** Testing migration files exist but not testing that they can be applied
- **Typical count:** 5-10

### 26. Dependency Audit Tests

- **What it tests:** No critical/high CVEs in dependencies, lockfile is valid
- **When to write it:** Phase 6
- **Example pattern:** `npm audit --production --audit-level=critical`
- **Common pitfalls:** Ignoring dev dependency vulnerabilities. Supply chain attacks use dev deps too.
- **Typical count:** 3-5

### 27. Canary/Smoke Tests

- **What it tests:** Ultra-fast post-deploy health: homepage loads, health endpoints respond, critical pages render
- **When to write it:** Phase 0 (first test you write)
- **Example pattern:** Homepage 200, /api/health healthy, login form renders
- **Common pitfalls:** Too many tests in canary (should be < 30 seconds total)
- **Typical count:** 5-10

### 28. Council Fix Verification Tests

- **What it tests:** Every bug found by council review has been fixed and will not regress
- **When to write it:** Phase 10
- **Example pattern:**
  ```typescript
  test('[SEC-C1] Auth tokens are signed JWTs, not base64', async () => { /* ... */ });
  test('[BIZ-P1] Pricing page shows $15 not $9.99', async () => { /* ... */ });
  ```
- **Common pitfalls:** Fixing the bug but not adding a regression test. It WILL come back.
- **Typical count:** 30-70

### 29. Optimization Accuracy Tests

- **What it tests:** The core product actually delivers on its value promise
- **When to write it:** Phase 2
- **Example pattern:** Submit verbose prompt, verify savings > 0, verify output is shorter than input
- **Common pitfalls:** Testing that the API responds but not that the response is correct
- **Typical count:** 10-20

### 30. Key Sharing Detection Tests

- **What it tests:** API key abuse detection: IP tracking, user-agent diversity, anomaly thresholds
- **When to write it:** Phase 9
- **Example pattern:**
  ```typescript
  test('Anomaly detection logs warnings at 5+ unique IPs', async () => {
    const sourceCode = readFileSync('backend/main.py', 'utf-8');
    expect(sourceCode).toContain('"ips_warning": 5');
  });
  ```
- **Common pitfalls:** Only building detection without prevention (key types, per-seat keys)
- **Typical count:** 10-15

---

## 4. CONTRACTS & ARTIFACTS

### site.contract.json -- Every Link

Every clickable element on your site. One source of truth.

```json
{
  "$schema": "site-contract-v1",
  "links": [
    {
      "id": "nav-pricing",
      "source": "/",
      "selector": "nav >> a:has-text('Pricing')",
      "expectedDestination": "/pricing",
      "pageMarker": "body",
      "priority": "critical",
      "category": "navigation",
      "authRequired": false
    }
  ]
}
```

**Fields:**
- `id` -- unique identifier for test output
- `source` -- page the link is on
- `selector` -- Playwright selector to find the element
- `expectedDestination` -- URL the link should navigate to
- `pageMarker` -- CSS selector that must be visible on the destination page (proves the page loaded correctly)
- `priority` -- `critical` (blocks launch), `high` (should fix), `low` (nice to have)
- `category` -- `navigation`, `cta`, `footer`, `auth`, `in-page`
- `authRequired` -- whether the test needs a logged-in user
- `clickType` -- `link` (default), `router` (client-side navigation), `mailto`, `disabled`

**How to maintain:** Every time you add a page or link, add a line to this file. The test suite will immediately test it.

### pages.contract.json -- Every Route

```json
{
  "$schema": "pages-contract-v1",
  "routes": [
    { "path": "/", "expectedTitle": "YourBrand", "status": 200, "authRequired": false },
    { "path": "/pricing", "expectedTitle": "YourBrand", "status": 200, "authRequired": false },
    { "path": "/account", "expectedTitle": "YourBrand", "status": 200, "authRequired": true }
  ]
}
```

### flows.contract.json -- Every User Journey

Multi-step flows defined as JSON. The flow crawler executes them automatically.

```json
{
  "$schema": "flows-contract-v1",
  "flows": [
    {
      "id": "pricing-to-signup",
      "name": "Pricing -> Subscribe -> Signup Form",
      "priority": "critical",
      "authRequired": false,
      "category": "signup",
      "steps": [
        { "action": "navigate", "url": "/pricing" },
        { "action": "wait", "forSelector": "button:has-text('Subscribe now')" },
        { "action": "click", "selector": "button:has-text('Subscribe now')", "expectedUrl": "/auth/signup" },
        { "action": "assert", "type": "url", "value": "/auth/signup" },
        { "action": "assert", "type": "visible", "selector": "input[name='email']" }
      ]
    }
  ]
}
```

**Step types:**
- `navigate` -- go to URL
- `click` -- click element, optionally verify expectedUrl
- `fill` -- type into input field
- `submit` -- submit form, optionally wait for API response
- `assert` -- verify URL, visibility, text content
- `wait` -- wait for selector, URL, or milliseconds
- `auth` -- create/login test user
- `interact` -- toggle, slide, select

### slo.contract.json -- Every SLO Target

```json
{
  "$schema": "slo-contract-v1",
  "endpoints": [
    { "url": "/health", "method": "GET", "p95": 500, "p99": 1000 },
    { "url": "/api/optimize", "method": "POST", "p95": 1500, "p99": 2000, "requiresAuth": true }
  ]
}
```

### api.contract.json -- Every API Endpoint

```json
{
  "$schema": "api-contract-v1",
  "baseUrl": "https://api.yourproduct.com",
  "endpoints": {
    "health": {
      "method": "GET",
      "path": "/health",
      "auth": false,
      "expectedStatus": 200,
      "responseSchema": {
        "required": ["status", "timestamp", "database"]
      }
    }
  }
}
```

### products.contract.json -- Every Distributable Product

```json
{
  "$schema": "products-contract-v1",
  "products": [
    {
      "id": "npm",
      "name": "@yourproduct/core",
      "type": "npm-package",
      "exports": ["YourClient"],
      "methods": ["optimize", "getUsage", "healthCheck"],
      "canAutoTest": true
    }
  ]
}
```

---

## 5. CI/CD INTEGRATION

### What Runs When

#### On Every Commit (Pre-Push)

**Target: < 2 minutes**

```
qa-canary (5-10 tests, < 30 seconds)
  - Homepage loads
  - Health endpoints respond
  - Login/signup forms render
  - Critical page renders (pricing, docs)
```

Rationale: If the canary fails, you broke something fundamental. Stop and fix before pushing.

#### On PR (Pre-Merge)

**Target: < 10 minutes**

```
qa-canary             (smoke)
qa-navigation         (contract links)
qa-intent             (CTA verification)
qa-forms              (form validation)
qa-seo                (meta tags)
qa-security           (auth headers, cookie flags)
qa-freshness          (content sync)
product-api-contract  (API schema)
```

Rationale: Every PR must prove it did not break navigation, CTAs, forms, or security. If a reviewer sees all green, they can focus on code quality instead of "does it work."

#### On Deploy (Post-Deploy)

**Target: < 1 minute**

```
qa-canary ONLY
  - Run against production URL
  - If ANY test fails: trigger rollback alert
```

Rationale: Post-deploy canary is your last line of defense. It must be fast enough to run before traffic is routed to the new deployment.

#### Nightly (Exhaustive)

**Target: < 30 minutes**

```
qa-system (ALL specs)
  - All 57+ spec files
  - All 1,000+ tests
  - Includes fuzz testing, attack chains, cookie security
  - Includes database migration verification
  - Includes dependency audit
  - Includes accessibility deep scan
```

Rationale: Some tests are too slow or too destructive (fuzz testing, sustained load) for every PR. Run them nightly so issues are caught within 24 hours.

#### Weekly (Performance)

**Target: < 1 hour**

```
qa-sustained-load   (30-60 second continuous traffic)
qa-perf-ext         (extended performance benchmarks)
load-10x            (burst test)
load-100x           (burst test)
qa-lighthouse       (Core Web Vitals)
```

Rationale: Performance regressions are gradual. Weekly testing catches drift before users notice.

### Pipeline Configuration (Playwright Projects)

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // === Tier 1: Every commit ===
    { name: 'qa-canary', testDir: './qa-system/specs', testMatch: '28-canary-smoke.spec.ts', timeout: 30000 },

    // === Tier 2: Every PR ===
    { name: 'qa-navigation', testDir: './qa-system/specs', testMatch: '01-navigation.spec.ts', timeout: 30000 },
    { name: 'qa-intent', testDir: './qa-system/specs', testMatch: '02-intent.spec.ts', timeout: 30000 },
    { name: 'qa-forms', testDir: './qa-system/specs', testMatch: '04-forms.spec.ts', timeout: 30000 },
    { name: 'qa-seo', testDir: './qa-system/specs', testMatch: '07-seo-meta.spec.ts', timeout: 30000 },
    { name: 'qa-security', testDir: './qa-system/specs', testMatch: '08-security.spec.ts', timeout: 30000 },

    // === Tier 3: Nightly ===
    { name: 'qa-system', testDir: './qa-system/specs', testMatch: '*.spec.ts', timeout: 120000 },

    // === Tier 4: Weekly ===
    { name: 'qa-sustained-load', testDir: './qa-system/specs', testMatch: '37-sustained-load.spec.ts', timeout: 300000 },
    { name: 'load-100x', testMatch: 'load-100x-journey.spec.ts', timeout: 300000 },
  ],
});
```

---

## 6. COUNCIL REVIEW SCHEDULE

### Security Council

**When:** After Phase 1 (auth) + After Phase 9 (hardening) + Before launch

**What they evaluate:**
- Token signing and verification
- Cookie security flags
- Secret management (no hardcoded keys)
- Auth bypass paths (x-user-context, forged headers)
- Injection vectors (XSS, SQLi, CRLF)
- Admin endpoint protection
- Rate limiting configuration

**Deliverable:** List of findings with severity (P0/P1/P2). Each becomes a regression test.

### UX Council

**When:** After Phase 3 (website) + After Phase 5 (flows) + Before launch

**What they evaluate:**
- CTA clarity and destination accuracy
- Signup vs login disambiguation
- Error message quality
- Mobile usability
- Accessibility compliance
- Visual consistency

**Deliverable:** List of findings. Common bugs: "Subscribe" goes to login instead of signup, error messages say "Error" with no context, mobile nav does not work.

### Business Council

**When:** After Phase 4 (billing) + Before launch

**What they evaluate:**
- Price consistency across all surfaces (frontend, API, Stripe, emails)
- Annual billing toggle actually changes checkout price (not visual-only)
- Fabricated social proof ("Join 10,000+ users" when you have 12)
- Seat calculator matches breakdown table
- Upgrade/downgrade flows work for authenticated users

**Deliverable:** Pricing audit report. Every number on every page verified against the backend.

### Operations Council

**When:** After Phase 6 (infrastructure) + Before launch

**What they evaluate:**
- Health endpoint completeness (all dependencies reported)
- Structured logging with request_id
- Graceful shutdown handling
- Error handling (no stack traces leaked to clients)
- Deployment pipeline safety (rollback capability)
- Monitoring and alerting configuration

**Deliverable:** Operational readiness checklist.

### Product Council

**When:** After Phase 2 (core product) + After SDK releases + Before launch

**What they evaluate:**
- API contract compliance
- SDK build and install verification
- Product accuracy (does it deliver claimed value?)
- Rate limit appropriateness
- Documentation completeness

**Deliverable:** Product readiness report.

---

## 7. LESSONS LEARNED

### Top 20 Lessons From Building fortress-optimizer

These are not hypothetical. Every lesson corresponds to a real bug, a real fix, and a real regression test.

**1. Fabricated stats destroy trust faster than anything.**
The homepage claimed "Join 10,000+ developers" and "23 enterprise integrations" when neither was true. A content freshness test now verifies every stat against actual data. If you do not have the numbers, do not claim them.

**2. Link tests that do not verify destination are useless.**
Our first navigation tests only checked that `href="/pricing"` existed in the HTML. They passed even when the pricing page was a 404. Now every link test clicks the element and verifies the destination URL AND page content.

**3. Source-code-as-test creates false confidence.**
We initially tested JWT handling by reading the source code: `expect(authCode).toContain('jwt.verify')`. The code contained `jwt.verify` but it was in a commented-out block. Live behavior tests (actually sending forged JWTs and verifying rejection) are the only reliable method.

**4. CI that only runs smoke tests is decorative.**
Our CI ran 5 canary tests and reported "all green" while 80+ tests in the full suite were failing. CI must run enough tests to catch real regressions. At minimum: canary + navigation + intent + security on every PR.

**5. Annual billing toggle that is visual-only is a bait-and-switch.**
The toggle changed the displayed price from $15 to $12 but the Stripe checkout still used $15. A flow test that toggles annual and verifies the checkout session price caught this.

**6. Unauthenticated "Subscribe" must go to signup, not login.**
A user who has never created an account cannot log in. When clicking "Subscribe now" on the pricing page, unauthenticated users were redirected to `/auth/login` where they had no credentials. The fix: redirect to `/auth/signup?callbackUrl=/pricing`.

**7. Hardcoded JWT secrets must crash in production, not log a warning.**
Our first implementation logged `console.error('WARNING: using default JWT secret')` and continued. An attacker who guessed the default secret could forge admin tokens. The fix: `throw new Error()` if `JWT_SECRET` equals the default.

**8. "x-user-context" headers are an auth bypass.**
We had an endpoint that trusted a client-sent header (`x-user-context`) containing base64-encoded user data. Anyone could forge this header. Source code tests now verify that no endpoint uses this pattern.

**9. Password reset must always return 200.**
Returning 404 when an email does not exist reveals whether an email is registered in your system. This is an email enumeration vulnerability. Always return 200 regardless of whether the email exists.

**10. Cookie flags are the last line of defense.**
Without HttpOnly, JavaScript (and therefore any XSS) can read your auth token. Without Secure, the token is sent over HTTP. Without SameSite, CSRF attacks work. Test all three flags on every auth cookie.

**11. Test isolation requires unique data per run.**
Tests that create users with `test@example.com` fail on the second run because the user already exists. Use `Date.now().toString(36)` as a unique suffix: `test-${UNIQUE}@example.com`.

**12. Rate limiting protects you but breaks your tests.**
After 10 test runs, the rate limiter blocks all requests. Tests must handle 429 responses gracefully (skip, not fail) and use unique data to avoid triggering per-email rate limits.

**13. Playwright needs hydration time for React pages.**
Client-rendered pages need `waitForTimeout(3000-5000)` after navigation. The page may return 200 and show HTML but button click handlers are not attached until React hydrates. This caused "element not clickable" failures.

**14. Contract files are living documents.**
Every new page, link, or endpoint must be added to the contract files. If the contract is stale, the tests are incomplete. Make "update contract" part of your PR checklist.

**15. Council reviews find bugs automated tests miss.**
Automated tests verify behavior. Councils verify intent. "Does this pricing page make sense to a customer?" is not something Playwright can answer. You need human reviewers with domain expertise.

**16. Every council finding must become a regression test.**
If a council finds a bug and you fix it without writing a test, the bug will come back within 2 sprints. The fix is cheap; the regression test is the insurance policy.

**17. Pricing consistency requires testing every surface.**
You have prices in: the pricing page HTML, the pricing page JavaScript, the API response, the Stripe checkout, the upgrade email, the account page, and the docs. If any one of these disagrees, users lose trust.

**18. Footer copyright year is a canary for freshness.**
If the footer says 2025 and it is 2026, everything on the site looks stale. One test, one line of code to fix, massive impact on perception.

**19. 500 errors are never acceptable responses to user input.**
No matter what garbage an attacker submits -- `<script>`, SQL injection, 1MB of text, null bytes -- the server must never return 500. It should return 400 (bad request) with a sanitized error message. Fuzz tests enforce this.

**20. The test suite IS the specification.**
After 1,078 tests, the test suite is a more accurate description of what the product does than any documentation, PRD, or README. If the tests say "Pro costs $15/month," that is the price. If the tests say "unauthenticated users go to /auth/signup," that is the behavior. Treat your tests as the single source of truth.

---

## 8. CHECKLIST TEMPLATE

Copy this checklist for your project. Check off items as you complete each phase.

### Phase 0: Foundation
- [ ] Monorepo structure created
- [ ] Playwright installed (`npm init playwright@latest`)
- [ ] playwright.config.ts with project structure
- [ ] qa-system/contracts/ directory created
- [ ] Empty site.contract.json created
- [ ] Empty pages.contract.json created
- [ ] Empty flows.contract.json created
- [ ] Empty slo.contract.json created
- [ ] Empty api.contract.json created
- [ ] Contract loader utility written (shared/contract-loader.ts)
- [ ] Evidence collector fixture written (shared/fixtures.ts)
- [ ] CI pipeline YAML created (runs canary only)
- [ ] Canary smoke spec created (spec 28)

**Expected tests: 5-10**
**GO/NO-GO:** CI pipeline runs and reports results (even if 0 tests). Contract files parse without errors.

---

### Phase 1: Authentication & Security
- [ ] Signup API test written (RED)
- [ ] Signup API implemented (GREEN)
- [ ] Login API test written (cookie-based auth)
- [ ] Login API implemented
- [ ] JWT validation tests (forged, expired, malformed)
- [ ] JWT middleware implemented
- [ ] Password reset tests (always returns 200)
- [ ] Password reset implemented
- [ ] Cookie flag tests (HttpOnly, Secure, SameSite)
- [ ] Secret management test (crash on default secret)
- [ ] Auth helper functions extracted (createAuthUser, authHeaders)
- [ ] pages.contract.json updated with auth routes

**Expected tests: 15-25**
**GO/NO-GO:** Forged JWT is rejected. Login sets HttpOnly cookie. Default secret crashes server.

---

### Phase 2: Core Product
- [ ] api.contract.json fully specified
- [ ] API contract tests written (all required fields)
- [ ] Core endpoint implemented and passing contracts
- [ ] Accuracy tests written (product delivers on promise)
- [ ] Error handling tests (400 on bad input, never 500)
- [ ] Rate limiting tests
- [ ] API key lifecycle tests (register, rotate, deactivate)
- [ ] products.contract.json created (if SDKs exist)
- [ ] SDK build verification tests

**Expected tests: 30-50**
**GO/NO-GO:** Core endpoint returns correct data. Accuracy tests prove value delivery. No 500 errors on any input.

---

### Phase 3: Website & Marketing
- [ ] site.contract.json populated with all links
- [ ] pages.contract.json populated with all routes
- [ ] Navigation spec (01-navigation.spec.ts)
- [ ] Intent spec (02-intent.spec.ts)
- [ ] Accessibility spec (03-accessibility.spec.ts)
- [ ] Forms spec (04-forms.spec.ts)
- [ ] Visual regression spec (05-visual.spec.ts)
- [ ] Mobile responsive spec (06-mobile.spec.ts)
- [ ] SEO meta spec (07-seo-meta.spec.ts)
- [ ] Content freshness spec (20-content-freshness.spec.ts)
- [ ] Sitemap and robots.txt spec (21-sitemap-robots.spec.ts)
- [ ] All visual baselines captured

**Expected tests: 80-120**
**GO/NO-GO:** Every link in the contract goes to the right destination. Every CTA delivers on its promise. Accessibility audit passes.

---

### Phase 4: Billing & Subscriptions
- [ ] Stripe checkout session tests
- [ ] Webhook handler tests (valid, invalid, duplicate)
- [ ] Subscription lifecycle tests
- [ ] Pricing consistency tests (frontend = backend = Stripe)
- [ ] Annual/monthly toggle wired to real Stripe prices
- [ ] RBAC tier enforcement tests
- [ ] Free user cannot access paid features
- [ ] Upgrade/downgrade flow tests

**Expected tests: 20-35**
**GO/NO-GO:** Prices match everywhere. Free users are blocked from paid features. Webhooks handle duplicates.

---

### Phase 5: User Journeys
- [ ] flows.contract.json populated with all critical journeys
- [ ] Flow crawler spec (13-flow-crawler.spec.ts)
- [ ] Post-action destination spec (31-post-action-destinations.spec.ts)
- [ ] Signup journey (homepage -> signup -> dashboard)
- [ ] Upgrade journey (account -> pricing -> subscribe)
- [ ] Login with callback journey
- [ ] Forgot password journey
- [ ] Cross-link verification (login <-> signup <-> team signup)

**Expected tests: 20-30**
**GO/NO-GO:** Every critical flow completes end-to-end. No user lands on a dead end.

---

### Phase 6: Operations & Infrastructure
- [ ] Health endpoint tests (all dependencies)
- [ ] Canary smoke spec updated for production
- [ ] Structured logging verification
- [ ] Error handling tests (no stack traces to client)
- [ ] Graceful shutdown test
- [ ] Database migration tests (Prisma schema valid, migrations exist)
- [ ] Dependency audit (no critical CVEs)

**Expected tests: 15-25**
**GO/NO-GO:** Health endpoint reports all dependencies. Logs are structured JSON. No critical CVEs.

---

### Phase 7: Support & Customer Service
- [ ] Ticket creation tests
- [ ] Ticket isolation tests (multi-tenant)
- [ ] Email trigger tests (no crashes, correct status codes)
- [ ] Password reset rate limiting
- [ ] XSS in ticket content sanitized

**Expected tests: 10-20**
**GO/NO-GO:** Tickets created with UUID-based numbers. User A cannot see User B tickets. Email triggers do not crash.

---

### Phase 8: Load & Performance
- [ ] slo.contract.json populated with all endpoints
- [ ] SLO enforcement tests (P95, P99)
- [ ] Burst tests (10x, 100x)
- [ ] Sustained load test (30 seconds)
- [ ] Latency drift detection

**Expected tests: 10-20**
**GO/NO-GO:** Zero 500 errors under sustained load. All endpoints within SLO targets.

---

### Phase 9: Security Hardening
- [ ] XSS fuzz testing (all input fields)
- [ ] SQL injection fuzz testing
- [ ] JWT attack tests (forge, expire, malform)
- [ ] Privilege escalation tests
- [ ] Cookie security verification
- [ ] Attack chain tests (multi-step)
- [ ] Key sharing detection verification
- [ ] CSRF protection verification
- [ ] Source code audit tests (no hardcoded secrets, no trust-client patterns)

**Expected tests: 25-40**
**GO/NO-GO:** No 500 errors on any fuzz input. All attack chains blocked. All cookie flags set correctly.

---

### Phase 10: Council Reviews
- [ ] Security council review completed
- [ ] UX council review completed
- [ ] Business council review completed
- [ ] Operations council review completed
- [ ] Product council review completed
- [ ] council-fixes.spec.ts written with all findings
- [ ] business-council-fixes.spec.ts written with all findings
- [ ] All regression tests passing

**Expected tests: 40-70**
**GO/NO-GO:** Every P0 and P1 finding is fixed. Every fix has a regression test. All regression tests pass.

---

### LAUNCH READINESS SUMMARY

| Phase | Tests | Status |
|-------|-------|--------|
| 0: Foundation | 5-10 | |
| 1: Auth & Security | 15-25 | |
| 2: Core Product | 30-50 | |
| 3: Website & Marketing | 80-120 | |
| 4: Billing | 20-35 | |
| 5: User Journeys | 20-30 | |
| 6: Operations | 15-25 | |
| 7: Support | 10-20 | |
| 8: Performance | 10-20 | |
| 9: Security Hardening | 25-40 | |
| 10: Council Reviews | 40-70 | |
| **TOTAL** | **270-445** | |

**LAUNCH CRITERIA:**
- [ ] All canary tests pass against production
- [ ] All navigation contract tests pass
- [ ] All intent tests pass
- [ ] All security tests pass
- [ ] All pricing consistency tests pass
- [ ] All council fix regression tests pass
- [ ] Zero 500 errors in fuzz testing
- [ ] Zero 500 errors under sustained load
- [ ] All SLO targets met
- [ ] All P0 and P1 council findings resolved

**The test suite is the specification. If it passes, ship it.**

---

*This playbook was created by 14 council personas based on building fortress-optimizer-monorepo: 57 website QA specs, 8 product agent specs, 5 e2e journey specs, 6 contract files, 8 council reviews, 90 commits, and 1,078 tests that caught 80+ real bugs before any user ever saw them.*
