/**
 * Email automation API — admin-only marketing sequence trigger
 *
 * History: this used to accept ANY {email, sequenceId} from anyone and
 * blast email sequences via Resend. Open spam relay. Caught by
 * 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on 2026-04-08.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { requireAdmin } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

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
      // Schedule the email via Resend
      await sendEmail({
        to: recipientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.htmlBody,
      });

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
