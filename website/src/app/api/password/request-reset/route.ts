/**
 * Request Password Reset
 * POST /api/password/request-reset
 *
 * Always returns 200 to prevent email enumeration.
 * Sends reset email only if user exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { checkPasswordResetRateLimit } from '@/lib/rate-limit';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.fortress-optimizer.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit by email
    const rateLimit = checkPasswordResetRateLimit(normalizedEmail);
    if (!rateLimit.allowed) {
      // Still return 200 to prevent enumeration
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Look up user — but always return 200 regardless
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

      try {
        await sendEmail({
          to: normalizedEmail,
          subject: 'Reset your Fortress Optimizer password',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Fortress Optimizer account.</p>
            <p><a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
        // Don't expose email failure to user
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
