/**
 * Email Management API — admin-only inbox of received customer emails
 *
 * History: this used to return ALL inbox emails to anyone who hit the URL.
 * Caught by 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/emails (admin-only)
 * Get all emails with optional filtering
 * Query params:
 *   - status: 'unread' | 'read' | 'replied' | 'archived'
 *   - category: 'support' | 'sales' | 'enterprise' | 'feedback' | 'general'
 *   - isEnterprise: 'true' | 'false'
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const isEnterprise = searchParams.get('isEnterprise');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: any = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (isEnterprise !== null) filters.isEnterprise = isEnterprise === 'true';

    // Get total count
    const count = await prisma.email.count({ where: filters });

    // Get emails
    const emails = await prisma.email.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        replies: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count,
      emails: emails.map((email) => ({
        ...email,
        replies: email.replies,
      })),
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
