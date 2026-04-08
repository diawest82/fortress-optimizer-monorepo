/**
 * Email sequences management API (admin-only marketing automation)
 *
 * History: this used to allow anyone to read AND create marketing email
 * sequences. Caught by 83-auth-pattern-guard as a KNOWN_BROKEN_STUB on
 * 2026-04-08.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';

const prisma = new PrismaClient();

// Get all sequences (admin-only)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const sequences = await prisma.emailSequence.findMany({
      include: { emails: true },
    });

    return NextResponse.json(sequences);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sequences' },
      { status: 500 }
    );
  }
}

// Create new sequence (admin-only)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { name, description, emails } = await req.json();

    const sequence = await prisma.emailSequence.create({
      data: {
        name,
        description,
        emails: {
          createMany: {
            data: emails.map((email: any, idx: number) => ({
              order: idx + 1,
              delayHours: email.delayHours || 0,
              subject: email.subject,
              htmlBody: email.htmlBody,
              plainBody: email.plainBody,
              variables: email.variables || [],
            })),
          },
        },
      },
      include: { emails: true },
    });

    return NextResponse.json(sequence);
  } catch (error) {
    console.error('Sequence creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create sequence' },
      { status: 500 }
    );
  }
}
