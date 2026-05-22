import { createUser } from "@/lib/auth-config";
import { checkSignupRateLimit } from "@/lib/rate-limit";
import { logSignupEvent, logSuspiciousActivity } from "@/lib/audit-log";
import { validatePassword } from "@/lib/password-validation";
import { setAuthTokenCookie, setCsrfTokenCookie } from "@/lib/secure-cookies";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "CHANGE-THIS-IN-PRODUCTION";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Get client IP for rate limiting and audit logging
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limit
    const rateLimit = checkSignupRateLimit(clientIp);
    if (!rateLimit.allowed) {
      await logSuspiciousActivity(email, clientIp, userAgent, 'RATE_LIMIT_EXCEEDED', {
        endpoint: '/api/auth/signup',
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      });

      return NextResponse.json(
        { 
          error: `Too many signup attempts. Please try again in ${rateLimit.resetIn} seconds.`,
          retryAfter: rateLimit.resetIn,
        },
        { status: 429, headers: { 'Retry-After': rateLimit.resetIn.toString() } }
      );
    }

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate name: reject HTML/JS injection attempts.
    // Legitimate names don't contain <, >, or quote chars. React escapes on
    // render, but defense-in-depth: keep the stored value clean so downstream
    // consumers (emails, exports, admin UIs) can't be tricked into rendering it.
    if (typeof name !== 'string' || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be a string under 100 characters" },
        { status: 400 }
      );
    }
    if (/[<>"`]|javascript:|data:|on\w+=/i.test(name)) {
      await logSuspiciousActivity(email, clientIp, userAgent, 'XSS_ATTEMPT_NAME', {
        endpoint: '/api/auth/signup',
        nameSample: name.slice(0, 50),
      });
      return NextResponse.json(
        { error: "Name contains invalid characters" },
        { status: 400 }
      );
    }

    // ============ PHASE 4: Validate password strength ============
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      // PREVIOUSLY: this returned `NextResponse.json(errorResponse.body, ...)`
      // where `errorResponse` was already a NextResponse — its `.body` is a
      // ReadableStream, NOT a plain object. JSON.stringify of a stream is `{}`,
      // so the actual feedback was getting silently dropped on the floor and
      // clients saw `400 {}` with no clue what went wrong. The 2026-04-08
      // qa-stripe-live failures took an hour to diagnose because of this.
      //
      // Fix: return the structured error directly with the feedback in the
      // body, so consumers can actually see what's wrong.
      return NextResponse.json(
        {
          code: 'INVALID_PASSWORD',
          message: 'Password does not meet requirements',
          feedback: passwordValidation.feedback,
        },
        { status: 400 }
      );
    }

    // Log password strength score for analytics
    console.log(`✓ Signup password strength: ${passwordValidation.score}/100`);

    // Create user
    const user = await createUser(email, password, name);

    // Log successful signup
    await logSignupEvent(email, clientIp, userAgent);

    // Generate JWT (same as login — user should be authenticated immediately)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name || name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate CSRF token
    const csrfToken = crypto.randomUUID();

    // Build response with cookies
    const response = NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name || name } },
      { status: 201 }
    );

    // Set auth cookie (httpOnly) + indicator cookie (readable by JS) + CSRF
    setAuthTokenCookie(response, token);
    setCsrfTokenCookie(response, csrfToken);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
