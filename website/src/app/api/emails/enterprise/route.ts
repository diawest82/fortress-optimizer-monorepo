/**
 * Enterprise Emails Query
 * GET /api/emails/enterprise
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const emails = await prisma.email.findMany({
      where: { isEnterprise: true },
      orderBy: { timestamp: 'desc' },
      include: {
        replies: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('Error fetching enterprise emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enterprise emails' },
      { status: 500 }
    );
  }
}
