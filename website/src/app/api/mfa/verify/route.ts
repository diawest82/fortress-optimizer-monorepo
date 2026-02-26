import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { code, setupData, method } = await request.json();

    if (!code || !setupData || !method) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // In production, verify the TOTP code against the secret
    // For now, accept any 6-digit code for demonstration
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(4).toString('hex').toUpperCase()
    );

    // In production, save the MFA setup to the database
    // For now, just return the backup codes

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
