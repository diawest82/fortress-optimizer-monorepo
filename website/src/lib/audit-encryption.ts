/**
 * Audit Log Encryption Service
 * Encrypts sensitive fields in audit logs
 */

import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

export interface EncryptedAuditLog {
  eventType: string;
  userId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  encryptedData: string; // Encrypted sensitive fields
  iv: string; // Initialization vector
  authTag: string; // Authentication tag for GCM
}

/**
 * Encrypt sensitive audit log data
 */
export function encryptAuditData(sensitiveData: Record<string, unknown>): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY as Buffer, iv);

  const jsonData = JSON.stringify(sensitiveData);
  const encrypted = Buffer.concat([
    cipher.update(jsonData, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt audit log data
 */
export function decryptAuditData(
  encryptedData: string,
  iv: string,
  authTag: string
): Record<string, unknown> | null {
  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      ENCRYPTION_KEY as Buffer,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(encryptedData, 'hex'),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to decrypt audit data:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Fields to encrypt in audit logs
 */
const SENSITIVE_FIELDS = [
  'email',
  'apiKey',
  'password',
  'oldPassword',
  'newPassword',
  'apiKeyValue',
  'refreshToken',
  'socialSecurityNumber',
];

/**
 * Extract sensitive fields from audit data
 */
export function extractSensitiveFields(data: Record<string, unknown>): {
  public: Record<string, unknown>;
  sensitive: Record<string, unknown>;
} {
  const publicData: Record<string, unknown> = {};
  const sensitiveData: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sensitiveData[key] = value;
    } else {
      publicData[key] = value;
    }
  });

  return { public: publicData, sensitive: sensitiveData };
}

/**
 * Hash sensitive data for comparison without storing plaintext
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate encryption key for setup
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(key: string): boolean {
  try {
    const buffer = Buffer.from(key, 'base64');
    return buffer.length === 32;
  } catch {
    return false;
  }
}
