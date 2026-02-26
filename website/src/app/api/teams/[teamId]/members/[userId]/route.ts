/**
 * Team Member Management - Individual Member
 * DELETE /api/teams/:teamId/members/:userId - Remove member from team
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, userId } = await params;

    // Get team and verify ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Only team owner can remove members' }, { status: 403 });
    }

    // Remove member
    await prisma.team.update({
      where: { id: teamId },
      data: {
        members: {
          disconnect: { id: userId },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('DELETE /api/teams/:teamId/members/:userId error:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
