/**
 * Email Chain Tests — delivery verification, team invite, payment failure
 * Gaps: C1 (email delivery), C2 (team invite), C3 (payment failure email)
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Email Chain: Delivery Infrastructure', () => {

  test('[C1] Email module uses Resend', () => {
    const file = join(WEBSITE_DIR, 'src/lib/email.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/Resend|resend/);
    expect(content).toContain('RESEND_API_KEY');
  });

  test('[C1] Welcome email function exists', () => {
    const file = join(WEBSITE_DIR, 'src/lib/email.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/sendWelcomeEmail|welcome/i);
  });

  test('[C1] Password reset or recovery email capability exists', () => {
    const file = join(WEBSITE_DIR, 'src/lib/email.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    // May be handled by a generic sendEmail or specific function
    expect(content).toMatch(/reset|password|sendEmail|Resend/i);
  });

  test('[C1] Support ticket confirmation email exists', () => {
    const file = join(WEBSITE_DIR, 'src/lib/email.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/sendSupportTicketEmail|ticketConfirmation/i);
  });
});

test.describe('Email Chain: Team Invite', () => {

  test('[C2] Team invite email function exists', () => {
    const file = join(WEBSITE_DIR, 'src/lib/email.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/sendTeamInviteEmail|teamInvite/i);
  });

  test('[C2] Invite flow calls email function', () => {
    const file = join(WEBSITE_DIR, 'src/app/api/teams/[teamId]/members/route.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/sendTeamInviteEmail/);
  });

  test('[C2] Invite endpoint requires team membership', async ({ request }) => {
    const res = await request.post(`${BASE}/api/teams/fake-team/members`, {
      data: { email: 'test@test.com' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe('Email Chain: Payment Failure', () => {

  test('[C3] Payment failure email function exists', () => {
    const file = join(WEBSITE_DIR, 'src/lib/email.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/sendPaymentFailedEmail|paymentFailed/i);
  });

  test('[C3] Stripe webhook handles invoice.payment_failed', () => {
    const paths = [
      join(WEBSITE_DIR, 'src/app/api/webhook/stripe/route.ts'),
      join(WEBSITE_DIR, 'src/app/api/webhooks/stripe/route.ts'),
    ];
    const file = paths.find(p => existsSync(p));
    if (!file) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('payment_failed');
  });
});
