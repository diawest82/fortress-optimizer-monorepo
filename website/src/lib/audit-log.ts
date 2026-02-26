/**
 * Audit Logging Service
 * Logs all important account and security events for compliance and auditing
 */

type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_VERIFIED'
  | 'API_KEY_GENERATED'
  | 'API_KEY_REVOKED'
  | 'ACCOUNT_SETTINGS_UPDATED'
  | 'ACCOUNT_LOCKED'
  | '2FA_ENABLED'
  | '2FA_DISABLED'
  | '2FA_VERIFIED'
  | 'SESSION_CREATED'
  | 'SESSION_TERMINATED'
  | 'SUSPICIOUS_ACTIVITY_DETECTED';

interface AuditLogEntry {
  id: string;
  userId?: string;
  email?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE';
  details?: Record<string, unknown>;
  errorMessage?: string;
  timestamp: Date;
  sessionId?: string;
}

// In-memory audit log (in production, use database)
const auditLogs: AuditLogEntry[] = [];

// Maximum logs to keep in memory
const MAX_LOGS = 10000;

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
  const auditEntry: AuditLogEntry = {
    ...entry,
    id: generateAuditId(),
    timestamp: new Date(),
  };

  // Store in memory (in production, save to database)
  auditLogs.push(auditEntry);

  // Keep only recent logs
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.shift();
  }

  // In production, also send to external logging service
  if (process.env.NODE_ENV === 'production') {
    await sendToExternalService(auditEntry);
  }

  return auditEntry;
}

/**
 * Log a login attempt
 */
export async function logLoginAttempt(
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await createAuditLog({
    email,
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    resource: 'account',
    ipAddress,
    userAgent,
    status: success ? 'SUCCESS' : 'FAILURE',
    errorMessage,
  });
}

/**
 * Log a logout event
 */
export async function logLogoutEvent(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'LOGOUT',
    resource: 'session',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log a signup event
 */
export async function logSignupEvent(
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await createAuditLog({
    email,
    action: 'SIGNUP',
    resource: 'account',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log a password change
 */
export async function logPasswordChange(
  userId: string,
  ipAddress: string,
  userAgent: string,
  success: boolean
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'PASSWORD_CHANGED',
    resource: 'account',
    ipAddress,
    userAgent,
    status: success ? 'SUCCESS' : 'FAILURE',
  });
}

/**
 * Log an API key generation
 */
export async function logApiKeyGeneration(
  userId: string,
  keyName: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'API_KEY_GENERATED',
    resource: 'api_key',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    details: {
      keyName,
      maskedKey: `${keyName}...`,
    },
  });
}

/**
 * Log an API key revocation
 */
export async function logApiKeyRevocation(
  userId: string,
  keyId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'API_KEY_REVOKED',
    resource: 'api_key',
    resourceId: keyId,
    ipAddress,
    userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log account locked event
 */
export async function logAccountLocked(
  email: string,
  reason: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await createAuditLog({
    email,
    action: 'ACCOUNT_LOCKED',
    resource: 'account',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    details: { reason },
  });
}

/**
 * Log 2FA enablement
 */
export async function log2FAEnabled(
  userId: string,
  method: 'totp' | 'sms' | 'email',
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: '2FA_ENABLED',
    resource: 'account',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    details: { method },
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  email: string | undefined,
  ipAddress: string,
  userAgent: string,
  activityType: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    email,
    action: 'SUSPICIOUS_ACTIVITY_DETECTED',
    resource: 'security',
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    details: {
      activityType,
      ...details,
    },
  });
}

/**
 * Get audit logs for a user
 */
export function getAuditLogsForUser(userId: string, limit: number = 100): AuditLogEntry[] {
  return auditLogs
    .filter((log) => log.userId === userId)
    .slice(-limit);
}

/**
 * Get audit logs by action type
 */
export function getAuditLogsByAction(action: AuditAction, limit: number = 100): AuditLogEntry[] {
  return auditLogs
    .filter((log) => log.action === action)
    .slice(-limit);
}

/**
 * Get recent failed login attempts by IP
 */
export function getFailedLoginsByIp(ipAddress: string, minutes: number = 60): AuditLogEntry[] {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  return auditLogs.filter(
    (log) =>
      log.action === 'LOGIN_FAILED' &&
      log.ipAddress === ipAddress &&
      log.timestamp > cutoffTime
  );
}

/**
 * Generate unique audit log ID
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Send audit log to external service (e.g., Datadog, Splunk, LogRocket)
 */
async function sendToExternalService(entry: AuditLogEntry): Promise<void> {
  try {
    // Example: Send to external logging service
    // await fetch(process.env.AUDIT_LOG_ENDPOINT, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry),
    // });

    // For now, just log to console in production
    console.log('[AUDIT]', JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to send audit log to external service:', error);
  }
}

/**
 * Get all audit logs (admin only)
 */
export function getAllAuditLogs(limit: number = 1000): AuditLogEntry[] {
  return auditLogs.slice(-limit);
}

/**
 * Export audit logs as JSON
 */
export function exportAuditLogsAsJson(): string {
  return JSON.stringify(auditLogs, null, 2);
}

/**
 * Clear audit logs (for testing)
 */
export function clearAuditLogs(): void {
  auditLogs.length = 0;
}
