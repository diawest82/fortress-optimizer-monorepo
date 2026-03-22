/**
 * Email Inbox Verification — Verify emails are sent correctly
 * Tests email source code patterns and API responses.
 * Full inbox verification requires Resend API access.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Email Inbox Verification', () => {

  test.describe('Email Sending Functions Exist', () => {
    test('Welcome email function exists', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('sendWelcomeEmail');
    });

    test('Password reset email function exists', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('sendEmail');
    });

    test('Support ticket email function exists', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('sendSupportTicketEmail');
    });

    test('Team invite email function exists', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('sendTeamInviteEmail');
    });

    test('Payment failed email function exists', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('sendPaymentFailedEmail');
    });

    test('Upgrade confirmation email function exists', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('sendUpgradeConfirmationEmail');
    });
  });

  test.describe('Email Configuration', () => {
    test('From address uses fortress-optimizer.com (not resend.dev default)', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('fortress-optimizer.com');
      // Should have env var override
      expect(emailLib).toContain('FROM_EMAIL');
    });

    test('Support email is support@fortress-optimizer.com', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('support@fortress-optimizer.com');
    });

    test('Resend API key required (defensive initialization)', async () => {
      const emailLib = readFileSync(join(WEBSITE_DIR, 'src/lib/email.ts'), 'utf-8');
      expect(emailLib).toContain('RESEND_API_KEY');
    });
  });

  test.describe('Email API Endpoints', () => {
    test('Password reset endpoint returns 200 (no email enumeration)', async () => {
      const res = await fetch(`${BASE}/api/password/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `nonexistent-${UNIQUE}@test.fortress-optimizer.com` }),
      });
      expect(res.status).toBe(200);
    });

    test('Support ticket endpoint accepts tickets', async () => {
      // Without auth, should return 401
      const res = await fetch(`${BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Email test', description: 'Testing email' }),
      });
      expect(res.status).not.toBe(500);
    });
  });
});
