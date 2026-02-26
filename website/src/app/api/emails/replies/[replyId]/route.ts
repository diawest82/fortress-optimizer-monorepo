/**
 * Email Reply Status Update API
 * PATCH /api/emails/replies/{replyId} - Update reply status
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
) {
  try {
    const { replyId } = await params;
    const body = await request.json();

    const { status, subject, body: replyBody } = body;

    // Find the reply
    const reply = await prisma.emailReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    // Update reply
    const updatedReply = await prisma.emailReply.update({
      where: { id: replyId },
      data: {
        ...(status && { status }),
        ...(subject && { subject }),
        ...(replyBody && { body: replyBody }),
        ...(status === 'sent' && { sentAt: new Date() }),
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

    // If reply status changed to 'sent', update parent email
    if (status === 'sent') {
      await prisma.email.update({
        where: { id: reply.emailId },
        data: { status: 'replied' },
      });
    }

    return NextResponse.json(updatedReply);
  } catch (error) {
    console.error('Error updating reply:', error);
    return NextResponse.json(
      { error: 'Failed to update reply' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
) {
  try {
    const { replyId } = await params;

    const reply = await prisma.emailReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of draft replies
    if (reply.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft replies' },
        { status: 400 }
      );
    }

    await prisma.emailReply.delete({
      where: { id: replyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reply:', error);
    return NextResponse.json(
      { error: 'Failed to delete reply' },
      { status: 500 }
    );
  }
}
