import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputTokens, originalTokens, optimizedTokens, savings } = body;

    // Get session ID from cookies or generate one
    let sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Track the usage
    await prisma.tokenCountUsage.create({
      data: {
        inputTokens,
        originalTokens,
        optimizedTokens,
        savings,
        sessionId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token count tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
