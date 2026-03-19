import { checkLoginRateLimit } from "@/lib/rate-limit";
import { isAccountLocked, recordFailedAttempt, clearFailedAttempts } from "@/lib/account-lockout";
import { logLoginAttempt, logAccountLocked } from "@/lib/audit-log";
import { setAuthTokenCookie } from "@/lib/secure-cookies";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "CHANGE-THIS-IN-PRODUCTION";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Get client information
    const clientIp = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ============ PHASE 4: Check Account Lockout ============
    if (isAccountLocked(email)) {
      const lockInfo = { isLocked: true, remainingSeconds: 1800 };

      return NextResponse.json(
        {
          error: `Account is temporarily locked. Please try again in ${lockInfo.remainingSeconds} seconds.`,
          locked: true,
          remainingSeconds: lockInfo.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // ============ PHASE 4: Rate Limiting ============
    const rateLimit = checkLoginRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${rateLimit.resetIn} seconds.`,
          retryAfter: rateLimit.resetIn,
        },
        { status: 429, headers: { "Retry-After": rateLimit.resetIn.toString() } }
      );
    }

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ============ Authenticate User ============
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error("Invalid credentials");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // ============ PHASE 4: Clear Failed Attempts on Success ============
      clearFailedAttempts(email);

      // ============ PHASE 4: Audit Log - Successful Login ============
      await logLoginAttempt(email, clientIp, userAgent, true);

      // ============ Generate Signed JWT ============
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Return user info but NOT the token — token goes in httpOnly cookie only
      const response = NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
        { status: 200 }
      );

      // ============ PHASE 4: Set Secure httpOnly Cookie ============
      setAuthTokenCookie(response, token);

      return response;
    } catch (authError) {
      // ============ PHASE 4: Record Failed Attempt ============
      const failureResult = recordFailedAttempt(email);

      // ============ PHASE 4: Audit Log - Failed Login ============
      await logLoginAttempt(
        email,
        clientIp,
        userAgent,
        false,
        authError instanceof Error ? authError.message : "Invalid credentials"
      );

      // If account is now locked, log it
      if (failureResult.isNowLocked) {
        await logAccountLocked(
          email,
          `Too many failed login attempts (${failureResult.failedAttempts})`,
          clientIp,
          userAgent
        );
      }

      return NextResponse.json(
        {
          error: "Invalid email or password",
          locked: failureResult.isNowLocked,
          remainingAttempts: failureResult.remainingAttempts,
        },
        { status: 401 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
