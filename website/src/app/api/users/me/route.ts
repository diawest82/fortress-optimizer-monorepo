/**
 * User Account API
 * GET    /api/users/me  - Get current user profile
 * PUT    /api/users/me  - Update profile (name)
 * DELETE /api/users/me  - Soft-delete account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/jwt-auth';
import { prisma } from '@/lib/prisma';



export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json(
        { error: 'Name must be a string under 100 characters' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name ?? undefined },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete — set subscription to cancelled and clear name
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'deleted',
        name: '[deleted]',
      },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
