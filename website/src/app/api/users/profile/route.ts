/**
 * User Profile API
 * GET /api/users/profile - Get current user profile
 * POST /api/users/profile - Update user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE-THIS-IN-PRODUCTION';

function extractUserIdFromToken(req: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      return decoded.id;
    } catch {
      // Fall through to cookie check
    }
  }

  // Try httpOnly cookie
  const cookieToken = req.cookies.get('fortress_auth_token')?.value;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, JWT_SECRET) as { id: string };
      return decoded.id;
    } catch {
      return null;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
