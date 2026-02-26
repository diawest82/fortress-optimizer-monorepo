// Security Event Logger Service
// Tracks security events and logs them to a centralized location

export type SecurityEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SecurityEvent {
  id: string;
  type: string;
  severity: SecurityEventSeverity;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

class SecurityEventLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000;

  logEvent(
    type: string,
    severity: SecurityEventSeverity,
    message: string,
    metadata?: Record<string, unknown>
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      metadata,
      timestamp: new Date(),
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In production, send to external logging service
    if (severity === 'critical' || severity === 'error') {
      console.error(`[${severity.toUpperCase()}] ${type}: ${message}`, metadata);
    } else {
      console.log(`[${severity.toUpperCase()}] ${type}: ${message}`, metadata);
    }

    return event;
  }

  logPasswordChange(userId: string, metadata?: Record<string, unknown>) {
    return this.logEvent(
      'password_changed',
      'info',
      `User ${userId} changed password`,
      metadata
    );
  }

  logMFAEnabled(userId: string, method: string) {
    return this.logEvent(
      'mfa_enabled',
      'info',
      `User ${userId} enabled MFA via ${method}`,
      { method }
    );
  }

  logMFADisabled(userId: string) {
    return this.logEvent(
      'mfa_disabled',
      'warning',
      `User ${userId} disabled MFA`,
      {}
    );
  }

  logLoginAttempt(userId: string, success: boolean, ipAddress?: string) {
    return this.logEvent(
      'login_attempt',
      success ? 'info' : 'warning',
      `Login attempt for user ${userId} ${success ? 'succeeded' : 'failed'}`,
      { userId, ipAddress, success }
    );
  }

  logFailedLoginAttempt(ipAddress: string, email: string, reason: string) {
    return this.logEvent(
      'failed_login',
      'warning',
      `Failed login attempt for ${email}`,
      { ipAddress, email, reason }
    );
  }

  logSuspiciousActivity(userId: string, activityType: string, metadata?: Record<string, unknown>) {
    return this.logEvent(
      'suspicious_activity',
      'critical',
      `Suspicious activity detected for user ${userId}`,
      { userId, activityType, ...metadata }
    );
  }

  logSessionCreated(userId: string, sessionId: string) {
    return this.logEvent(
      'session_created',
      'info',
      `Session created for user ${userId}`,
      { userId, sessionId }
    );
  }

  logSessionRevoked(userId: string, sessionId: string) {
    return this.logEvent(
      'session_revoked',
      'info',
      `Session revoked for user ${userId}`,
      { userId, sessionId }
    );
  }

  logUnauthorizedAccess(userId: string, resource: string) {
    return this.logEvent(
      'unauthorized_access',
      'error',
      `Unauthorized access attempt to ${resource}`,
      { userId, resource }
    );
  }

  getEvents(filter?: { severity?: SecurityEventSeverity; type?: string; limit?: number }): SecurityEvent[] {
    let filtered = [...this.events];

    if (filter?.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }

    if (filter?.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.reverse(); // Newest first
  }

  clear() {
    this.events = [];
  }
}

// Export singleton instance
export const securityLogger = new SecurityEventLogger();
