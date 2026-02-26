import { generateCsrfToken } from "@/lib/csrf";
import { setCsrfTokenCookie } from "@/lib/secure-cookies";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/csrf-token
 * Returns a new CSRF token for protecting state-changing requests
 */
export async function GET(req: NextRequest) {
  try {
    const { token, secret } = generateCsrfToken();

    const response = NextResponse.json({
      csrfToken: token,
      secret: secret,
    });

    // Set CSRF token as cookie (not httpOnly, so JavaScript can read it)
    setCsrfTokenCookie(response, token);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate CSRF token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
