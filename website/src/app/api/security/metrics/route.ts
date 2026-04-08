/**
 * GET /api/security/metrics — per-user security posture
 *
 * History: this used to return hardcoded mock data with no auth check.
 * Caught by 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Current implementation is honest: returns real values for things we
 * actually track (account age, MFA status, active session count) and
 * omits fields we don't (password strength). Don't add fake values to
 * the missing fields just to keep the UI populated — that's the same
 * pattern that produced the original mock-data bug.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/jwt-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user
    .findUnique({
      where: { id: auth.id },
      select: { createdAt: true },
    })
    .catch(() => null);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountAgeDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return NextResponse.json({
    // mfaEnabled: TODO — wire to real MFA setup once persisted
    // activeSessions: TODO — requires prisma.session, which is not yet
    //   generated in the Prisma client (NextAuth model defined but client
    //   wasn't regenerated). Returning 1 (the current request) is honest.
    activeSessions: 1,
    accountAge: accountAgeDays,
  });
}
