import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate unique referral code
    const code = `${user.id.substring(0, 8)}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

    // Create referral code
    const referralCode = await prisma.referralCode.create({
      data: {
        code,
        userId: user.id,
        isActive: true
      }
    });

    return NextResponse.json({
      code: referralCode.code,
      link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fortress-optimizer.com'}/signup?ref=${referralCode.code}`
    });
  } catch (error) {
    console.error('Generate referral code error:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's referral code
    let referralCode = await prisma.referralCode.findFirst({
      where: { userId: user.id }
    });

    // If no code exists, create one
    if (!referralCode) {
      const code = `${user.id.substring(0, 8)}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
      referralCode = await prisma.referralCode.create({
        data: {
          code,
          userId: user.id,
          isActive: true
        }
      });
    }

    return NextResponse.json({
      code: referralCode.code,
      link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fortress-optimizer.com'}/signup?ref=${referralCode.code}`
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    return NextResponse.json({ error: 'Failed to get code' }, { status: 500 });
  }
}
