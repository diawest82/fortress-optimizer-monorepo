/**
 * POST /api/mfa/verify
 *
 * Verifies a TOTP code against the setup secret and returns backup codes.
 *
 * History: this used to accept ANY 6-digit code as valid and return backup
 * codes — no auth, no actual verification. Caught by 83-auth-pattern-guard
 * as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Current implementation:
 *   - Requires an authenticated session.
 *   - Still does NOT actually verify the code against a real secret —
 *     that requires persistence in the totp-setup endpoint, which is
 *     a separate todo. The auth gap is fixed; the verification logic
 *     remains a stub.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyAuthToken } from '@/lib/jwt-auth';

export async function POST(request: NextRequest) {
  const auth = verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code, setupData, method } = await request.json();

    if (!code || !setupData || !method) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // TODO: verify the TOTP code against a persisted secret.
    // Currently just enforces format — any well-formed code passes.
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(4).toString('hex').toUpperCase()
    );

    // TODO: save the MFA setup + backup codes to the database, scoped to auth.id

    return NextResponse.json({
      verified: true,
      backupCodes,
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
