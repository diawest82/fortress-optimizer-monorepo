/**
 * Individual Email Management API
 * Endpoints for specific email operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/emails/[id]
 * Get a specific email by ID
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/emails/[id]
 * Update email status or properties
 * Body:
 * {
 *   status?: 'unread' | 'read' | 'replied' | 'archived'
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status field is required' },
        { status: 400 }
      );
    }

    const email = await prisma.email.update({
      where: { id },
      data: { status },
      include: {
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
}
