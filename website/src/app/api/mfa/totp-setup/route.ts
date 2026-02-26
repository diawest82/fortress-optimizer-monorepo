import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Generate TOTP secret and QR code
function generateTOTPSecret(email: string): { secret: string; qrCode: string } {
  // Generate a random secret (base32 encoded)
  const secret = randomBytes(32).toString('base64').replace(/=/g, '').substring(0, 32);
  
  // Generate QR code URL for authenticator apps
  const appName = 'Fortress';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${appName}`;

  return {
    secret,
    qrCode: qrCodeUrl,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const { secret, qrCode } = generateTOTPSecret(email);

    // In production, store the secret temporarily with a session ID
    // For now, return it to the client for storage during setup

    return NextResponse.json({
      secret,
      qrCodeUrl: qrCode,
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    );
  }
}
