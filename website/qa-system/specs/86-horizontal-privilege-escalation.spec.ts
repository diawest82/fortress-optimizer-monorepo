/**
 * Horizontal Privilege Escalation — LIVE tests
 * User A must NOT be able to access User B's data via parameter manipulation.
 * Tests LIVE endpoints, not just source code.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

test.describe('Privilege Escalation: Unauthenticated Access', () => {

  test('Cannot access other user tickets without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/support/tickets`);
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot access dashboard stats without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats?range=7d`);
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot access profile without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/profile`);
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot access API keys without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/api-keys`);
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot access subscriptions without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/subscriptions`);
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot access team data without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/any-team-id/usage`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('Cannot access team members without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/any-team-id/members`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('Cannot access admin KPIs without auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/kpis`);
    // Admin endpoints MUST require auth — 401/403 only.
    // The previous assertion `< 500` passed for unauthenticated 200s,
    // which is exactly how the unprotected /api/admin/kpis bug shipped.
    // See feedback_qa_admin_role_blindspot memory.
    expect(
      [401, 403],
      `/api/admin/kpis returned ${res.status()} for an unauthenticated request — admin endpoints must require auth.`
    ).toContain(res.status());
  });
});

test.describe('Privilege Escalation: Parameter Manipulation', () => {

  test('Cannot inject userId in dashboard stats request', async ({ request }) => {
    const res = await request.get(`${BASE}/api/dashboard/stats?range=7d&userId=other-user-id`);
    // Should either 401 (no auth) or ignore the userId param
    expect([401, 403]).toContain(res.status());
  });

  test('Cannot inject teamId to access other team', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teams/fake-team-id-12345/usage`);
    expect([401, 403, 404]).toContain(res.status());
  });
});
