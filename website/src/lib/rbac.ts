/**
 * Role-Based Access Control (RBAC)
 * Implements user roles and permissions system
 */

export type UserRole = 'admin' | 'moderator' | 'user' | 'viewer';
export type Permission = 
  | 'read:dashboard'
  | 'read:metrics'
  | 'write:settings'
  | 'manage:users'
  | 'read:audit'
  | 'manage:api-keys'
  | 'delete:account'
  | 'admin:access';

export interface RoleDefinition {
  name: UserRole;
  description: string;
  permissions: Permission[];
  priority: number; // Higher priority roles override lower ones
}

/**
 * Role definitions and their associated permissions
 */
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    name: 'admin',
    description: 'Full administrative access',
    permissions: [
      'read:dashboard',
      'read:metrics',
      'write:settings',
      'manage:users',
      'read:audit',
      'manage:api-keys',
      'delete:account',
      'admin:access',
    ],
    priority: 1000,
  },
  moderator: {
    name: 'moderator',
    description: 'Moderator with audit and user management',
    permissions: [
      'read:dashboard',
      'read:metrics',
      'write:settings',
      'read:audit',
      'manage:api-keys',
      'delete:account',
    ],
    priority: 500,
  },
  user: {
    name: 'user',
    description: 'Standard user access',
    permissions: [
      'read:dashboard',
      'read:metrics',
      'write:settings',
      'manage:api-keys',
      'delete:account',
    ],
    priority: 100,
  },
  viewer: {
    name: 'viewer',
    description: 'Read-only access',
    permissions: [
      'read:dashboard',
      'read:metrics',
    ],
    priority: 10,
  },
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const roleDefinition = ROLE_DEFINITIONS[role];
  return roleDefinition.permissions.includes(permission);
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Get the highest priority role
 */
export function getHighestRole(...roles: UserRole[]): UserRole | null {
  if (roles.length === 0) {
    return null;
  }

  return roles.reduce((highest, current) => {
    const highestPriority = ROLE_DEFINITIONS[highest].priority;
    const currentPriority = ROLE_DEFINITIONS[current].priority;
    return currentPriority > highestPriority ? current : highest;
  });
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_DEFINITIONS[role].permissions;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  return ROLE_DEFINITIONS[role].description;
}

/**
 * Check if a user can perform an action on a resource
 */
export function canPerformAction(
  userRole: UserRole,
  action: Permission,
  resourceOwnerId?: string,
  userId?: string
): boolean {
  // Admins and moderators can do anything
  if (userRole === 'admin' || userRole === 'moderator') {
    return true;
  }

  // Check basic permission
  if (!hasPermission(userRole, action)) {
    return false;
  }

  // For resource-specific actions, check ownership
  if (resourceOwnerId && userId) {
    return userId === resourceOwnerId;
  }

  return true;
}

/**
 * Middleware-like function to check authorization
 */
export function requirePermission(userRole: UserRole, requiredPermission: Permission): boolean {
  return hasPermission(userRole, requiredPermission);
}

/**
 * Validate role
 */
export function isValidRole(role: string): role is UserRole {
  return ['admin', 'moderator', 'user', 'viewer'].includes(role);
}

/**
 * Get default role for new users
 */
export function getDefaultRole(): UserRole {
  return 'user';
}

/**
 * Get role hierarchy
 */
export function getRoleHierarchy(): UserRole[] {
  const roles = Object.keys(ROLE_DEFINITIONS) as UserRole[];
  return roles.sort(
    (a, b) => ROLE_DEFINITIONS[b].priority - ROLE_DEFINITIONS[a].priority
  );
}
