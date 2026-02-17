/**
 * Email Management API
 * Endpoints for viewing and managing received emails
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getEmails,
  getEmail,
  updateEmailStatus,
  getUnreadCount,
  getEnterpriseQueries,
} from '@/lib/email-storage';

/**
 * GET /api/emails
 * Get all emails with optional filtering
 * Query params:
 *   - status: 'unread' | 'read' | 'replied' | 'archived'
 *   - category: 'support' | 'sales' | 'enterprise' | 'feedback' | 'general'
 *   - isEnterprise: 'true' | 'false'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const isEnterprise = searchParams.get('isEnterprise');

    const filters: any = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (isEnterprise !== null) filters.isEnterprise = isEnterprise === 'true';

    const emails = await getEmails(filters);

    return NextResponse.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
