import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokensPerDay, provider, teamSize, currentCost, optimizedCost, monthlySavings } = body;

    let sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    await prisma.costCalculatorUsage.create({
      data: {
        tokensPerDay,
        provider,
        teamSize: parseInt(teamSize),
        currentCost,
        optimizedCost,
        monthlySavings,
        sessionId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cost calculator tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
