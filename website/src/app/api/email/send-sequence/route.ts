// Email automation API
// File: src/app/api/email/send-sequence/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder for SendGrid integration
async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  plainBody: string
) {
  // TODO: Integrate with SendGrid, Resend, or your email service
  console.log(`Email queued: ${to} - ${subject}`);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, sequenceId } = await req.json();

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or userId required' },
        { status: 400 }
      );
    }

    const sequence = await prisma.emailSequence.findUnique({
      where: { id: sequenceId },
      include: { emails: { orderBy: { order: 'asc' } } },
    });

    if (!sequence || !sequence.isActive) {
      return NextResponse.json(
        { error: 'Sequence not found or inactive' },
        { status: 404 }
      );
    }

    const recipientEmail = email || (userId ? (await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }))?.email : null);

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Email address not found' },
        { status: 400 }
      );
    }

    // Send each email in sequence with delays
    const emailIds = [];
    for (const emailTemplate of sequence.emails) {
      // Schedule the email
      await sendEmail(
        recipientEmail,
        emailTemplate.subject,
        emailTemplate.htmlBody,
        emailTemplate.plainBody || ''
      );

      // Record the send
      const sent = await prisma.emailSent.create({
        data: {
          userId,
          email: recipientEmail,
          templateId: emailTemplate.id,
          subject: emailTemplate.subject,
        },
      });

      emailIds.push(sent.id);

      // Wait for delay before next email (if any)
      if (emailTemplate.delayHours > 0 && emailTemplate !== sequence.emails[sequence.emails.length - 1]) {
        await new Promise(resolve =>
          setTimeout(resolve, emailTemplate.delayHours * 60 * 60 * 1000)
        );
      }
    }

    return NextResponse.json({
      success: true,
      sequenceId,
      emailIds,
      recipientEmail,
    });
  } catch (error) {
    console.error('Email sequence error:', error);
    return NextResponse.json(
      { error: 'Failed to send email sequence' },
      { status: 500 }
    );
  }
}
