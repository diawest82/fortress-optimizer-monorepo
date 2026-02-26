/**
 * Multi-Factor Authentication (MFA) Service
 * Supports TOTP and SMS-based MFA
 */

export type MfaMethod = 'totp' | 'sms' | 'email';

export interface MfaConfig {
  userId: string;
  method: MfaMethod;
  isEnabled: boolean;
  secret?: string; // For TOTP
  phoneNumber?: string; // For SMS
  backupCodes: string[];
  createdAt: Date;
  lastVerified?: Date;
}

export interface MfaVerificationRequest {
  userId: string;
  code: string; // 6-digit code
  method: MfaMethod;
}

/**
 * Generate random backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code (store hashed version)
 */
export function hashBackupCode(code: string): string {
  // In production, use bcrypt
  return Buffer.from(code).toString('base64');
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(code: string, hashedCode: string): boolean {
  const hash = hashBackupCode(code);
  return hash === hashedCode;
}

/**
 * Format backup codes for display
 */
export function formatBackupCodes(codes: string[]): string {
  return codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
}

/**
 * Generate TOTP secret (for Google Authenticator, Authy, etc.)
 */
export function generateTotpSecret(): string {
  // In production, use speakeasy or similar library
  // For now, generate a random base32-like string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Get TOTP setup QR code URL
 * In production, use qrcode library
 */
export function getTotpQrCodeUrl(userId: string, secret: string, issuer: string = 'Fortress'): string {
  const encodedSecret = encodeURIComponent(secret);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${issuer}:${userId}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
}

/**
 * Validate TOTP code
 * In production, use speakeasy or similar library
 */
export function validateTotpCode(secret: string, code: string): boolean {
  // This is a placeholder - in production use speakeasy library
  // which handles time window validation properly
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  // In production:
  // const speakeasy = require('speakeasy');
  // return speakeasy.totp.verify({
  //   secret: secret,
  //   encoding: 'base32',
  //   token: code,
  //   window: 1, // Allow 1 time step drift
  // });

  return code.length === 6;
}

/**
 * Generate SMS code
 */
export function generateSmsCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * Validate SMS code
 */
export function validateSmsCode(code: string, expectedCode: string): boolean {
  // Use constant-time comparison to prevent timing attacks
  if (code.length !== expectedCode.length) {
    return false;
  }

  let isValid = true;
  for (let i = 0; i < code.length; i++) {
    if (code[i] !== expectedCode[i]) {
      isValid = false;
    }
  }

  return isValid;
}

/**
 * MFA status check
 */
export function isMfaEnabled(config: MfaConfig): boolean {
  return config.isEnabled && config.method !== null;
}

/**
 * Get MFA method display name
 */
export function getMfaMethodName(method: MfaMethod): string {
  const names: Record<MfaMethod, string> = {
    totp: 'Authenticator App',
    sms: 'Text Message',
    email: 'Email Code',
  };
  return names[method];
}

/**
 * MFA setup instructions
 */
export function getMfaSetupInstructions(method: MfaMethod): string {
  const instructions: Record<MfaMethod, string> = {
    totp: `
1. Download an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
2. Scan the QR code or enter the secret code
3. Enter the 6-digit code from your app
4. Save backup codes in a secure location
    `,
    sms: `
1. Verify your phone number
2. You'll receive a text message with a code
3. Enter the code to complete setup
4. Save backup codes for account recovery
    `,
    email: `
1. We'll send codes to your registered email
2. Enter the code from the email
3. Codes expire after 10 minutes
4. Save backup codes for emergencies
    `,
  };
  return instructions[method].trim();
}
