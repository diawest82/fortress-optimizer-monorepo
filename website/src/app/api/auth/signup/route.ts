import { createUser } from "@/lib/auth-config";
import { checkSignupRateLimit } from "@/lib/rate-limit";
import { logSignupEvent, logSuspiciousActivity } from "@/lib/audit-log";
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty', 'abc123456'];
    if (weakPasswords.some(wp => password.toLowerCase().includes(wp))) {
      return NextResponse.json(
        { error: "Password is too common. Please choose a stronger password" },
        { status: 400 }
      );
    }

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
