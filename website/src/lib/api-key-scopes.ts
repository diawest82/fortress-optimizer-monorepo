/**
 * API Key Management with Scoping
 * Implements scoped API keys with granular permissions
 */

export type ApiKeyScope =
  | 'read:metrics'
  | 'write:settings'
  | 'read:audit'
  | 'manage:keys'
  | 'admin';

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyHash: string; // bcrypt hash of the actual key
  scopes: ApiKeyScope[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  rateLimit?: number; // requests per minute
}

/**
 * Validate API key scope
 */
export function validateScope(scope: string): scope is ApiKeyScope {
  const validScopes: ApiKeyScope[] = [
    'read:metrics',
    'write:settings',
    'read:audit',
    'manage:keys',
    'admin',
  ];
  return validScopes.includes(scope as ApiKeyScope);
}

/**
 * Check if scope has permission
 */
export function hasPermission(scopes: ApiKeyScope[], requiredScope: ApiKeyScope): boolean {
  // Admin scope has all permissions
  if (scopes.includes('admin')) {
    return true;
  }

  return scopes.includes(requiredScope);
}

/**
 * Check multiple permissions (AND logic)
 */
export function hasAllPermissions(
  scopes: ApiKeyScope[],
  requiredScopes: ApiKeyScope[]
): boolean {
  return requiredScopes.every((scope) => hasPermission(scopes, scope));
}

/**
 * Check multiple permissions (OR logic)
 */
export function hasAnyPermission(
  scopes: ApiKeyScope[],
  requiredScopes: ApiKeyScope[]
): boolean {
  return requiredScopes.some((scope) => hasPermission(scopes, scope));
}

/**
 * Scope descriptions for documentation
 */
export const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  'read:metrics': 'Read access to usage metrics and analytics',
  'write:settings': 'Write access to account settings',
  'read:audit': 'Read access to audit logs',
  'manage:keys': 'Create, delete, and manage API keys',
  admin: 'Full administrative access',
};

/**
 * Default scopes for new API keys
 */
export const DEFAULT_SCOPES: ApiKeyScope[] = ['read:metrics'];

/**
 * All available scopes
 */
export const ALL_SCOPES: ApiKeyScope[] = [
  'read:metrics',
  'write:settings',
  'read:audit',
  'manage:keys',
  'admin',
];

/**
 * Validate API key expiration
 */
export function isKeyExpired(expiresAt?: Date): boolean {
  if (!expiresAt) {
    return false;
  }
  return new Date() > expiresAt;
}

/**
 * Validate API key status
 */
export function isKeyValid(key: ApiKeyRecord): boolean {
  if (!key.isActive) {
    return false;
  }
  if (isKeyExpired(key.expiresAt)) {
    return false;
  }
  return true;
}

/**
 * Get expiration warning message
 */
export function getExpirationWarning(expiresAt?: Date): string | null {
  if (!expiresAt) {
    return null;
  }

  const now = new Date();
  const daysUntilExpiry = Math.floor(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) {
    return 'This API key has expired';
  }
  if (daysUntilExpiry === 0) {
    return 'This API key expires today';
  }
  if (daysUntilExpiry <= 7) {
    return `This API key expires in ${daysUntilExpiry} days`;
  }

  return null;
}
