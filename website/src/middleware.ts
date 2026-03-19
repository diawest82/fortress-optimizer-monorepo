import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const _rawSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "CHANGE-THIS-IN-PRODUCTION";
const JWT_SECRET = new TextEncoder().encode(_rawSecret);

// Edge runtime can't throw at module level, but we can reject all tokens if secret is default
const SECRET_IS_SAFE = _rawSecret !== "CHANGE-THIS-IN-PRODUCTION" || process.env.NODE_ENV !== "production";

async function verifyCustomToken(token: string): Promise<boolean> {
  if (!SECRET_IS_SAFE) return false; // Reject all tokens if secret is insecure
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Check NextAuth session
  const nextAuthToken = await getToken({ req: request });

  // Check custom auth cookie — VERIFY the JWT signature, don't just check existence
  const customCookie = request.cookies.get("fortress_auth_token")?.value;
  const customTokenValid = customCookie ? await verifyCustomToken(customCookie) : false;

  const isAuthenticated = !!nextAuthToken || customTokenValid;
  const pathname = request.nextUrl.pathname;

  // Block test pages entirely in production
  const testRoutes = ["/test-checkout", "/stripe-test"];
  const isTestRoute = testRoutes.some((route) => pathname.startsWith(route));
  if (isTestRoute && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protected routes
  const protectedRoutes = ["/account", "/test-checkout", "/stripe-test"];
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  if (
    (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) &&
    isAuthenticated
  ) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/auth/:path*", "/test-checkout/:path*", "/stripe-test/:path*"],
};
