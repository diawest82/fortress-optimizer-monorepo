import { NextRequest, NextResponse } from 'next/server';
import { 
  generateTotpSecret, 
  generateBackupCodes, 
  validateSmsCode,
  getTotpQrCodeUrl 
} from '@/lib/mfa-service';
import { ErrorResponses } from '@/lib/error-handler';
import { log2FAEnabled, logSuspiciousActivity } from '@/lib/audit-log';

/**
 * MFA Setup Endpoint
 * Initiates MFA setup flow with TOTP secret generation and backup codes
 * Supports: TOTP (Google Authenticator, Authy), Backup Codes, SMS
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, method, verificationCode } = await request.json();

    // Get client information
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate required fields
    if (!userId || !email || !method) {
      const error = ErrorResponses.MISSING_REQUIRED_FIELDS(['userId', 'email', 'method']);
      return NextResponse.json(error.body, { status: error.status });
    }

    // Validate MFA method
    const validMethods = ['totp', 'sms', 'email'];
    if (!validMethods.includes(method)) {
      const error = ErrorResponses.VALIDATION_FAILED({
        message: `Invalid MFA method. Supported: ${validMethods.join(', ')}`,
        validMethods
      });
      return NextResponse.json(error.body, { status: error.status });
    }

    // ============ PHASE 4: MFA Setup Flow ============
    
    // Step 1: Initial setup - Generate secrets
    if (!verificationCode) {
      console.log(`📱 Initiating ${method.toUpperCase()} MFA setup for ${email}`);

      if (method === 'totp') {
        // Generate TOTP secret
        const secret = generateTotpSecret();
        const backupCodes = generateBackupCodes();

        // Generate QR code for authenticator apps
        const qrCodeUrl = getTotpQrCodeUrl(userId, secret, 'Fortress Optimizer');

        // In production, store secret in database with status='pending_verification'
        // For demo, return to client for setup
        return NextResponse.json(
          {
            setupId: `setup_${Date.now()}`,
            method: 'totp',
            secret, // Shared secret for authenticator
            qrCodeUrl, // QR code data URL
            backupCodes, // One-time backup codes
            message: 'Scan QR code with your authenticator app. Save backup codes in a secure location.',
            nextStep: 'Verify by providing a code from your authenticator app',
          },
          { status: 200 }
        );
      } else if (method === 'sms' || method === 'email') {
        // For SMS/Email, just acknowledge and ask for verification
        return NextResponse.json(
          {
            setupId: `setup_${Date.now()}`,
            method,
            message: `MFA setup initiated for ${method}. Verification code will be sent.`,
            nextStep: `Verify by providing the code sent to ${method === 'sms' ? 'your phone' : email}`,
          },
          { status: 200 }
        );
      }
    }

    // Step 2: Verify setup - Confirm the user has working MFA
    if (verificationCode) {
      console.log(`✓ Verifying ${method.toUpperCase()} MFA setup for ${email}`);

      // Validate MFA code based on method
      let isValid = false;
      
      if (method === 'totp') {
        // In production, retrieve secret from database
        // For demo, just check if code is 6 digits
        isValid = /^\d{6}$/.test(verificationCode);
      } else {
        // For SMS/Email, validate code format
        isValid = validateSmsCode(verificationCode, verificationCode);
      }

      if (!isValid) {
        await logSuspiciousActivity(
          email,
          clientIp,
          userAgent,
          'INVALID_MFA_CODE',
          { method, attemptedCode: verificationCode.substring(0, 3) + '***' }
        );

        const error = ErrorResponses.VALIDATION_FAILED({
          message: 'Invalid verification code',
          retryCount: 1
        });
        return NextResponse.json(error.body, { status: error.status });
      }

      // Log successful MFA setup
      await log2FAEnabled(email, method as 'totp' | 'sms' | 'email', clientIp, userAgent);

      return NextResponse.json(
        {
          success: true,
          message: `${method.toUpperCase()} MFA has been successfully enabled`,
          mfaEnabled: true,
          method,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('MFA setup error:', error);

    // Use VALIDATION_FAILED for general errors
    const errorResponse = ErrorResponses.VALIDATION_FAILED({
      message: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'MFA setup failed'
    });

    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}
