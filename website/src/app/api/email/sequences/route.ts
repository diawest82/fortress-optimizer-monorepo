// Email sequences management API
// File: src/app/api/email/sequences/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all sequences
export async function GET(req: NextRequest) {
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

// Create new sequence
export async function POST(req: NextRequest) {
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
