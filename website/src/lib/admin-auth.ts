/**
 * Admin Authorization Helper
 *
 * Verifies a request carries a valid session cookie AND that the user
 * has role === 'admin' in the database.
 *
 * Usage in a route handler:
 *
 *   export async function GET(req: NextRequest) {
 *     const auth = await requireAdmin(req);
 *     if (!auth.ok) return auth.response;
 *     // ... auth.user is the admin user
 *   }
 *
 * Why this exists: prior to 2026-04-07 every /api/admin/* route shipped
 * without any server-side auth check. The qa-system suite missed it because
 * 83-auth-pattern-guard explicitly exempted admin routes. See
 * 87-admin-surface-audit.spec.ts and the feedback_qa_admin_role_blindspot
 * memory for the post-mortem.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/jwt-auth';
import { prisma } from '@/lib/prisma';

export interface AdminAuthSuccess {
  ok: true;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export interface AdminAuthFailure {
  ok: false;
  response: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Verify the request is from an authenticated user with role === 'admin'.
 * Returns either { ok: true, user } or { ok: false, response } where the
 * response is a 401/403 NextResponse the route handler should return as-is.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const payload = verifyAuthToken(req);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  if (user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: admin role required' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
