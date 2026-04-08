/**
 * GET /api/security/sessions
 *
 * Returns active sessions for the authenticated user.
 *
 * History: this used to return hardcoded mock data (MacBook Pro / iPhone /
 * Windows Desktop) with no auth check at all — anyone on the internet could
 * call it and get fake-but-realistic-looking session data. Caught by
 * 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Current implementation:
 *   - Verifies the caller's identity via the fortress_auth_token cookie.
 *   - Returns a single synthetic "current session" entry derived from the
 *     in-flight JWT.
 *
 * Why no DB read: the NextAuth `Session` model is defined in schema.prisma
 * but the generated Prisma client at node_modules/.prisma/client/index.d.ts
 * does NOT expose `prisma.session`, so any DB read would fail at runtime.
 * Until that's fixed (separate migration todo), the only honest answer is
 * "you have one active session and it's the one making this request."
 *
 * Don't add fake device/browser/IP fields just to make the UI look complete —
 * the schema doesn't track them and that's exactly how the original mock-data
 * bug shipped. The UI must accept 'Unknown' values gracefully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/jwt-auth';

export async function GET(req: NextRequest) {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json([
    {
      id: 'current',
      device: 'Current device',
      browser: req.headers.get('user-agent')?.split(' ')[0] || 'Unknown',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'Unknown',
      country: 'Unknown',
      lastActivity: new Date().toISOString(),
      isCurrent: true,
    },
  ]);
}
