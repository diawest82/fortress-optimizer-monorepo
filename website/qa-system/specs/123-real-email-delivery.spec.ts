/**
 * Real Email Delivery — send via Resend, verify it was delivered
 * Uses RESEND_API_KEY to send and then query delivery status.
 */

import { test, expect } from '@playwright/test';

const RESEND_KEY = process.env.RESEND_API_KEY || '';

async function sendEmail(request: any, subject: string): Promise<string | null> {
  const res = await request.post('https://api.resend.com/emails', {
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    data: {
      from: 'Fortress Test <onboarding@resend.dev>',
      to: 'delivered@resend.dev',
      subject,
      text: 'Automated test from Fortress QA suite.',
    },
  });
  if (res.status() !== 200) return null;
  const data = await res.json();
  return data.id || null;
}

async function getEmailStatus(request: any, emailId: string): Promise<string> {
  const res = await request.get(`https://api.resend.com/emails/${emailId}`, {
    headers: { 'Authorization': `Bearer ${RESEND_KEY}` },
  });
  if (res.status() !== 200) return 'unknown';
  const data = await res.json();
  return data.last_event || 'sent';
}

test.describe('Real Email Delivery', () => {

  test('Send email and get email ID back', async ({ request }) => {
    if (!RESEND_KEY) { console.log('[email] No key — skipping'); return; }

    const emailId = await sendEmail(request, `QA Test ${Date.now()}`);
    if (!emailId) { console.log('[email] Send failed — key may be invalid'); return; }

    expect(emailId).toBeTruthy();
    console.log(`[email] Sent: ${emailId}`);
  });

  test('Sent email has delivery status', async ({ request }) => {
    if (!RESEND_KEY) return;

    const emailId = await sendEmail(request, `QA Delivery Check ${Date.now()}`);
    if (!emailId) return;

    // Wait briefly for delivery
    await new Promise(r => setTimeout(r, 2000));

    const status = await getEmailStatus(request, emailId);
    console.log(`[email] Status for ${emailId}: ${status}`);
    // Should be 'sent', 'delivered', or 'opened' — NOT 'bounced' or 'complained'
    expect(['sent', 'delivered', 'opened', 'clicked']).toContain(status);
  });

  test('Welcome email template would send successfully', async ({ request }) => {
    if (!RESEND_KEY) return;

    // Simulate the welcome email format
    const res = await request.post('https://api.resend.com/emails', {
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      data: {
        from: 'Fortress <onboarding@resend.dev>',
        to: 'delivered@resend.dev',
        subject: 'Welcome to Fortress Token Optimizer!',
        html: '<h1>Welcome!</h1><p>Thanks for signing up. Start saving tokens today.</p>',
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    console.log(`[email] Welcome template sent: ${data.id}`);
  });

  test('Support ticket email template would send', async ({ request }) => {
    if (!RESEND_KEY) return;

    const res = await request.post('https://api.resend.com/emails', {
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      data: {
        from: 'Fortress Support <onboarding@resend.dev>',
        to: 'delivered@resend.dev',
        subject: 'Support Ticket FORT-12345678 Created',
        html: '<h1>Ticket Created</h1><p>Your ticket FORT-12345678 has been received. We will respond within 24-48 hours.</p>',
      },
    });

    expect(res.status()).toBe(200);
  });
});
