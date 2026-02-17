/**
 * Unread Emails Count
 * GET /api/emails/stats/unread
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.email.count({
      where: { status: 'unread' },
    });

    return NextResponse.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
