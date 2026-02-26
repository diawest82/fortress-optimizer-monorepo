import { NextRequest, NextResponse } from 'next/server';
import { rotateTokens, verifyAccessToken } from '@/lib/token-rotation';
import { ErrorResponses } from '@/lib/error-handler';
import { logSuspiciousActivity } from '@/lib/audit-log';

/**
 * Token Refresh Endpoint
 * Validates refresh token and issues new access + refresh token pair
 * Implements token rotation to prevent reuse attacks
 */
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    // Get client information for audit logging
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate refresh token exists
    if (!refreshToken) {
      const error = ErrorResponses.UNAUTHORIZED();
      return NextResponse.json(error.body, { status: error.status });
    }

    // ============ PHASE 4: Token Rotation ============
    // Validate refresh token and rotate for new pair
    const newTokenPair = rotateTokens(refreshToken);
    
    if (!newTokenPair) {
      // Log suspicious activity - token validation failed or already blacklisted
      await logSuspiciousActivity(
        'unknown',
        clientIp,
        userAgent,
        'INVALID_REFRESH_TOKEN',
        { reason: 'Token validation failed or already blacklisted' }
      );

      const error = ErrorResponses.UNAUTHORIZED();
      return NextResponse.json(error.body, { status: error.status });
    }

    // Verify the new access token is valid
    const tokenPayload = verifyAccessToken(newTokenPair.accessToken);
    if (!tokenPayload) {
      console.error('Failed to verify newly generated token');
      const error = ErrorResponses.VALIDATION_FAILED({
        message: 'Token generation failed'
      });
      return NextResponse.json(error.body, { status: error.status });
    }

    console.log(`✓ Token rotated for user: ${tokenPayload.email}`);

    return NextResponse.json(
      {
        accessToken: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token refresh error:', error);

    const errorResponse = ErrorResponses.VALIDATION_FAILED({
      message: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'Token refresh failed'
    });

    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}
