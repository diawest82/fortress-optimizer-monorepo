/**
 * POST /api/security/sessions/[id]/revoke
 *
 * Revokes a session by id. Currently a stub because the generated Prisma
 * client doesn't expose `prisma.session` (the NextAuth model is defined
 * but the client wasn't regenerated). Until that's fixed, the only valid
 * "session" the caller knows about is the synthetic 'current' entry from
 * GET, and revoking that should go through /api/auth/logout instead.
 *
 * History: previously this was a stub that always returned success without
 * verifying the caller, the session, or even doing anything. Caught by
 * 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Auth gap is now closed; the underlying revoke logic remains a TODO until
 * the Prisma session client is regenerated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/jwt-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (id === 'current') {
    return NextResponse.json(
      { error: 'Use POST /api/auth/logout to end the current session' },
      { status: 400 }
    );
  }

  // Until prisma.session is generated, we can't look up arbitrary session
  // ids. Return 404 — no leak about other users, no false positive about
  // having actually revoked anything.
  return NextResponse.json({ error: 'Session not found' }, { status: 404 });
}
