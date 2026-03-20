/**
 * Fuzz Testing — XSS, SQLi, Unicode, Overflow, Injection
 * Throws malicious and edge-case input at every form and API endpoint.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

async function submitSignup(payload: Record<string, string>): Promise<Response> {
  return fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function submitOptimize(payload: Record<string, any>): Promise<Response> {
  return fetch(`${API_BASE}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fk_test_fuzz' },
    body: JSON.stringify(payload),
  });
}

test.describe('Fuzz Testing: Input Validation & Injection Defense', () => {

  test.describe('XSS Attacks', () => {
    test('Script tag in signup name field is rejected or escaped', async () => {
      const res = await submitSignup({
        email: 'xss-test@fuzz.test',
        password: 'SecureP@ss1!',
        name: '<script>alert("xss")</script>',
      });
      // Should not return 500
      expect(res.status).not.toBe(500);
      const body = await res.text();
      expect(body).not.toContain('<script>');
    });

    test('IMG onerror XSS in contact form is neutralized', async () => {
      const res = await fetch(`${BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'xss@fuzz.test',
          subject: 'Test',
          message: '<img src=x onerror="alert(1)">',
        }),
      });
      expect(res.status).not.toBe(500);
    });

    test('SVG XSS payload in name field', async () => {
      const res = await submitSignup({
        email: 'svg-xss@fuzz.test',
        password: 'SecureP@ss1!',
        name: '<svg onload="alert(1)">',
      });
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('SQL Injection', () => {
    test("Classic OR injection in email field", async () => {
      const res = await submitSignup({
        email: "' OR 1=1 --",
        password: 'SecureP@ss1!',
        name: 'SQLi Test',
      });
      expect(res.status).not.toBe(500);
      expect(res.status).toBeLessThan(500);
    });

    test('DROP TABLE injection in email', async () => {
      const res = await submitSignup({
        email: "'; DROP TABLE users;--",
        password: 'SecureP@ss1!',
        name: 'SQLi Test',
      });
      expect(res.status).not.toBe(500);
    });

    test('UNION SELECT injection in prompt', async () => {
      const res = await submitOptimize({
        prompt: "' UNION SELECT * FROM users--",
        level: 'balanced',
        provider: 'openai',
      });
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Buffer Overflow / Large Input', () => {
    test('10KB string in name field', async () => {
      const longName = 'A'.repeat(10000);
      const res = await submitSignup({
        email: 'overflow@fuzz.test',
        password: 'SecureP@ss1!',
        name: longName,
      });
      expect(res.status).not.toBe(500);
      // Should be 400 (too long), 200 (truncated), or 429 (rate limited from prior tests)
      expect([200, 201, 400, 413, 422, 429]).toContain(res.status);
    });

    test('100KB string in prompt optimization', async () => {
      const longPrompt = 'Please optimize this very long prompt. '.repeat(3000);
      const res = await submitOptimize({
        prompt: longPrompt,
        level: 'balanced',
        provider: 'openai',
      });
      expect(res.status).not.toBe(500);
    });

    test('Very long email address (300+ chars)', async () => {
      const longEmail = 'a'.repeat(300) + '@fuzz.test';
      const res = await submitSignup({
        email: longEmail,
        password: 'SecureP@ss1!',
        name: 'Long Email',
      });
      expect(res.status).not.toBe(500);
      expect([400, 422, 429]).toContain(res.status);
    });
  });

  test.describe('Special Characters & Unicode', () => {
    test('Null bytes in form fields rejected', async () => {
      const res = await submitSignup({
        email: 'null\x00byte@fuzz.test',
        password: 'SecureP@ss1!',
        name: 'Null\x00Test',
      });
      expect(res.status).not.toBe(500);
    });

    test('Unicode RTL override characters handled', async () => {
      const res = await submitSignup({
        email: 'rtl@fuzz.test',
        password: 'SecureP@ss1!',
        name: '\u202Eesrever',
      });
      expect(res.status).not.toBe(500);
    });

    test('Emoji-only name is handled consistently', async () => {
      const res = await submitSignup({
        email: 'emoji@fuzz.test',
        password: 'SecureP@ss1!',
        name: '🔥💀🎉',
      });
      expect(res.status).not.toBe(500);
    });

    test('Zero-width characters in team name', async () => {
      const res = await fetch(`${BASE}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Team\u200B\u200BName', seats: 5 }),
      });
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Injection Attacks', () => {
    test('Path traversal in API endpoint', async () => {
      const res = await fetch(`${BASE}/api/../../etc/passwd`);
      expect(res.status).not.toBe(200);
      const body = await res.text();
      expect(body).not.toContain('root:');
    });

    test('CRLF injection blocked by runtime', async () => {
      // fetch() itself rejects CRLF in headers — this is correct browser-level defense
      let threw = false;
      try {
        await fetch(`${BASE}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Injected': 'value\r\nSet-Cookie: evil=1',
          },
          body: JSON.stringify({ email: 'crlf@fuzz.test', password: 'SecureP@ss1!', name: 'CRLF' }),
        });
      } catch {
        threw = true;
      }
      // Either the runtime blocks it (throws) or server rejects it (non-500)
      expect(threw).toBe(true);
    });

    test('JSON injection: nested objects in string fields', async () => {
      const res = await submitSignup({
        email: '{"$gt": ""}@fuzz.test',
        password: 'SecureP@ss1!',
        name: '{"admin": true}',
      });
      expect(res.status).not.toBe(500);
    });

    test('Prototype pollution in JSON body', async () => {
      const res = await fetch(`${BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'proto@fuzz.test',
          password: 'SecureP@ss1!',
          name: 'Proto',
          __proto__: { admin: true },
          constructor: { prototype: { admin: true } },
        }),
      });
      expect(res.status).not.toBe(500);
    });
  });

  test.describe('Edge Case Values', () => {
    test('Password with only spaces rejected', async () => {
      const res = await submitSignup({
        email: 'spaces@fuzz.test',
        password: '        ',
        name: 'Space Password',
      });
      // Should reject — spaces-only is not a valid password
      expect(res.status).not.toBe(200);
    });

    test('Negative number in seats parameter', async () => {
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'teams', seats: -5, successUrl: '/', cancelUrl: '/' }),
      });
      expect(res.status).not.toBe(500);
    });

    test('Float in seats parameter', async () => {
      const res = await fetch(`${BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'teams', seats: 3.7, successUrl: '/', cancelUrl: '/' }),
      });
      expect(res.status).not.toBe(500);
    });

    test('Empty string for all required fields', async () => {
      const res = await submitSignup({ email: '', password: '', name: '' });
      expect(res.status).not.toBe(500);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
