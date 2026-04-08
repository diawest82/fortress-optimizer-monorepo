/**
 * POST /api/mfa/totp-setup
 *
 * Generates a TOTP secret + QR code URL bound to the AUTHENTICATED user's
 * email — never an arbitrary email from the request body.
 *
 * History: this used to read `email` from the request body and return a
 * TOTP setup for it, with no auth check whatsoever. Anyone could call it
 * with anyone else's email and get a usable secret. Caught by
 * 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 *
 * Note: this endpoint still does NOT persist the secret to the database.
 * That's a separate todo (the verify step also needs to be wired to a real
 * MFA flow). The fix here is purely the auth gap — the rest of the MFA
 * flow remains a stub.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyAuthToken } from '@/lib/jwt-auth';
import { prisma } from '@/lib/prisma';

function generateTOTPSecret(email: string): { secret: string; qrCode: string } {
  const secret = randomBytes(32).toString('base64').replace(/=/g, '').substring(0, 32);
  const appName = 'Fortress';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/${appName}:${encodeURIComponent(email)}?secret=${secret}&issuer=${appName}`;

  return { secret, qrCode: qrCodeUrl };
}

export async function POST(request: NextRequest) {
  const auth = verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up the actual user — never trust an email from the request body.
  const user = await prisma.user
    .findUnique({
      where: { id: auth.id },
      select: { email: true },
    })
    .catch(() => null);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { secret, qrCode } = generateTOTPSecret(user.email);

    // TODO: persist the secret to the database (currently a stub).
    // The verify step also needs to actually compare against this secret.

    return NextResponse.json({
      secret,
      qrCodeUrl: qrCode,
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
