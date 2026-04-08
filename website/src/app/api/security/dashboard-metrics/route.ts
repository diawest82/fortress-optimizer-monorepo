/**
 * GET /api/security/dashboard-metrics — admin-only security dashboard metrics
 *
 * History: this used to return hardcoded mock data (totalLogins: 1243,
 * failedLogins: 23, etc.) with no auth check. Caught by 83-auth-pattern-guard
 * as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Current implementation is honest: requires admin auth and returns real
 * values for the metrics we actually track. Fields we don't track are
 * omitted entirely rather than faked. The UI must handle missing fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  // Real values from the user table.
  // mfaAdoptionRate, totalLogins, failedLogins, suspiciousActivities all
  // require an audit-log table that doesn't exist yet. They're omitted
  // intentionally — don't fake them.
  const totalUsers = await prisma.user.count().catch(() => 0);

  return NextResponse.json({
    totalUsers,
    lastUpdated: new Date().toISOString(),
  });
}
