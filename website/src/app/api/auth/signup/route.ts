import { createUser } from "@/lib/auth-config";
import { checkSignupRateLimit } from "@/lib/rate-limit";
import { logSignupEvent, logSuspiciousActivity } from "@/lib/audit-log";
import { validatePassword } from "@/lib/password-validation";
import { ErrorResponses } from "@/lib/error-handler";
import { NextRequest, NextResponse } from "next/server";

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

    // ============ PHASE 4: Validate password strength ============
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      // Return structured error response with feedback
      const errorResponse = ErrorResponses.INVALID_PASSWORD(passwordValidation.feedback);
      return NextResponse.json(errorResponse.body, { status: errorResponse.status });
    }

    // Log password strength score for analytics
    console.log(`✓ Signup password strength: ${passwordValidation.score}/100`);

    // Create user
    const user = await createUser(email, password, name);
    
    // Log successful signup
    await logSignupEvent(email, clientIp, userAgent);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
