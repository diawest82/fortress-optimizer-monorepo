import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, canPerformAction, type UserRole } from '@/lib/rbac';
import { ErrorResponses } from '@/lib/error-handler';

/**
 * Protected Dashboard Settings Endpoint
 * Example of RBAC (Role-Based Access Control) integration
 * Only users with 'write:settings' permission can modify settings
 */

// Mock user context - in production, extract from JWT token
interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
}

function extractUserContext(request: NextRequest): AuthContext | null {
  // In production: verify JWT token from Authorization header
  // For demo, check custom header
  const userHeader = request.headers.get('x-user-context');
  if (!userHeader) return null;

  try {
    return JSON.parse(Buffer.from(userHeader, 'base64').toString());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // ============ PHASE 4: RBAC Check - Read Permission ============
    const user = extractUserContext(request);
    if (!user) {
      const error = ErrorResponses.UNAUTHORIZED();
      return NextResponse.json(error.body, { status: error.status });
    }

    // Check if user has read:dashboard permission
    const hasReadAccess = hasPermission(user.role, 'read:dashboard');
    if (!hasReadAccess) {
      const error = ErrorResponses.FORBIDDEN();
      return NextResponse.json(error.body, { status: error.status });
    }

    console.log(`✓ ${user.email} (${user.role}) accessed dashboard settings`);

    // Return settings based on user role
    const settings = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      dashboardSettings: {
        theme: 'dark',
        refreshInterval: 5000,
        metricsToDisplay: ['tokens', 'latency', 'cost'],
      },
      // Admin/Moderator can see extended analytics
      ...(hasPermission(user.role, 'read:audit') && {
        analyticsMode: 'extended',
        includeAuditLogs: true,
      }),
    };

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    const errorResponse = ErrorResponses.VALIDATION_FAILED({
      message: 'Failed to fetch settings'
    });
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ============ PHASE 4: RBAC Check - Write Permission ============
    const user = extractUserContext(request);
    if (!user) {
      const error = ErrorResponses.UNAUTHORIZED();
      return NextResponse.json(error.body, { status: error.status });
    }

    // Check if user has write:settings permission
    const hasWriteAccess = hasPermission(user.role, 'write:settings');
    if (!hasWriteAccess) {
      const error = ErrorResponses.FORBIDDEN();
      return NextResponse.json(error.body, { status: error.status });
    }

    const body = await request.json();
    const { theme, refreshInterval } = body;

    console.log(`✓ ${user.email} (${user.role}) updated dashboard settings`);

    return NextResponse.json(
      {
        success: true,
        message: 'Settings updated successfully',
        updated: {
          theme,
          refreshInterval,
          updatedBy: user.email,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard PUT error:', error);
    const errorResponse = ErrorResponses.VALIDATION_FAILED({
      message: 'Failed to update settings'
    });
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // ============ PHASE 4: RBAC Check - Admin-only Permission ============
    const user = extractUserContext(request);
    if (!user) {
      const error = ErrorResponses.UNAUTHORIZED();
      return NextResponse.json(error.body, { status: error.status });
    }

    // Check if user has admin:access permission (only admins)
    const hasAdminAccess = hasPermission(user.role, 'admin:access');
    if (!hasAdminAccess) {
      const error = ErrorResponses.FORBIDDEN();
      return NextResponse.json(error.body, { status: error.status });
    }

    const { resourceId } = await request.json();
    
    // Optionally check resource ownership
    const canDelete = canPerformAction(user.role, 'delete:account', resourceId, user.userId);
    if (!canDelete) {
      const error = ErrorResponses.FORBIDDEN();
      return NextResponse.json(error.body, { status: error.status });
    }

    console.log(`⚠️  ${user.email} (${user.role}) deleted resource: ${resourceId}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Resource deleted successfully',
        deletedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard DELETE error:', error);
    const errorResponse = ErrorResponses.VALIDATION_FAILED({
      message: 'Failed to delete resource'
    });
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}
