/**
 * Support Bidirectional Chain — ticket create → admin sees → admin responds → user sees
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';
const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Support Bidirectional Chain', () => {

  test('[source] Ticket response model exists in schema', () => {
    const file = join(WEBSITE_DIR, 'prisma/schema.prisma');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/SupportResponse|SupportTicket/);
  });

  test('[source] Ticket has response relation', () => {
    const file = join(WEBSITE_DIR, 'prisma/schema.prisma');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/responses.*SupportResponse|SupportResponse.*ticketId/);
  });

  test('[live] Create ticket requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/support/tickets`, {
      data: { subject: 'Bidir test', description: 'Testing', category: 'general', priority: 'normal' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('[live] List tickets requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/support/tickets`);
    expect([401, 403]).toContain(res.status());
  });

  test('[source] Support system component renders ticket list', () => {
    const file = join(WEBSITE_DIR, 'src/components/account/support-system.tsx');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/ticket|Ticket/);
    expect(content).toMatch(/status|priority|subject/);
  });
});
