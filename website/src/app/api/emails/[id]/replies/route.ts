/**
 * Email Reply API
 * GET  /api/emails/{id}/replies - Get replies for an email
 * POST /api/emails/{id}/replies - Create a reply
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const replies = await prisma.emailReply.findMany({
      where: { emailId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { to, subject, body: replyBody, status, userId } = body;

    if (!to || !subject || !replyBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Verify email exists
    const email = await prisma.email.findUnique({
      where: { id },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Create reply
    const reply = await prisma.emailReply.create({
      data: {
        emailId: id,
        userId,
        to,
        subject,
        body: replyBody,
        status: status || 'draft',
        sentAt: status === 'sent' ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If reply is being sent, update email status
    if (status === 'sent') {
      await prisma.email.update({
        where: { id },
        data: { status: 'replied' },
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}
