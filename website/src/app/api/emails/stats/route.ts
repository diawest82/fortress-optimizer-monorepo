/**
 * Email Statistics and Filtering API
 * Endpoints for specific email queries
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUnreadCount,
  getEnterpriseQueries,
  getEmails,
} from '@/lib/email-storage';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/emails/stats/unread (admin-only)
 * Get count of unread emails
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const pathname = request.nextUrl.pathname;

    if (pathname.includes('/stats/unread')) {
      const count = await getUnreadCount();
      return NextResponse.json({
        success: true,
        unreadCount: count,
      });
    }

    if (pathname.includes('/enterprise')) {
      const emails = await getEnterpriseQueries();
      return NextResponse.json({
        success: true,
        count: emails.length,
        emails,
      });
    }

    return NextResponse.json(
      { error: 'Endpoint not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
