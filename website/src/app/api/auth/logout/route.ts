/**
 * Logout API — Server-side session destruction
 * POST /api/auth/logout
 *
 * Clears ALL auth cookies (httpOnly cookies can ONLY be cleared server-side).
 * Client-side document.cookie cannot delete httpOnly cookies.
 */

import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/secure-cookies';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies server-side (the ONLY way to clear httpOnly cookies)
  clearAuthCookies(response);

  return response;
}
