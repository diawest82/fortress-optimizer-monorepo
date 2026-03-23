/**
 * Team Member Management
 * POST /api/teams/:teamId/members - Add member to team
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { checkTeamSeatLimit } from '@/lib/team-limits';
import { sendTeamInviteEmail } from '@/lib/email';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { id: true, email: true, name: true, createdAt: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Only team members can view the member list
    const isMember = team.members.some(m => m.id === session.user.id);
    if (!isMember && team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    // Enrich with per-member usage stats
    const membersWithUsage = await Promise.all(
      team.members.map(async (m) => {
        const usage = await prisma.tokenCountUsage.aggregate({
          where: { userId: m.id },
          _sum: { originalTokens: true, optimizedTokens: true },
          _count: true,
        }).catch(() => ({ _sum: { originalTokens: 0, optimizedTokens: 0 }, _count: 0 }));

        const original = usage._sum.originalTokens || 0;
        const optimized = usage._sum.optimizedTokens || 0;

        return {
          id: m.id,
          email: m.email,
          name: m.name,
          role: m.id === team.ownerId ? 'owner' : 'member',
          joinedAt: m.createdAt?.toISOString() || new Date().toISOString(),
          tokensProcessed: original,
          tokensSaved: original - optimized,
          optimizationCount: usage._count,
        };
      })
    );

    return NextResponse.json({
      success: true,
      members: membersWithUsage,
    });
  } catch (error) {
    console.error('GET /api/teams/:teamId/members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get team and check permissions
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true, owner: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Only team owner can add members' }, { status: 403 });
    }

    // Get owner's tier to check seat limits
    const owner = await prisma.user.findUnique({
      where: { id: team.ownerId },
      select: { tier: true },
    });

    if (!owner) {
      return NextResponse.json({ error: 'Team owner not found' }, { status: 404 });
    }

    // Check seat limit
    const seatCheck = await checkTeamSeatLimit(owner.tier, team.members.length);
    if (!seatCheck.allowed) {
      return NextResponse.json(
        { error: seatCheck.message, limit: seatCheck.limit },
        { status: 402 }
      );
    }

    // Find or create invited user
    let invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      // User doesn't exist yet - create invitation
      // Generate a random password hash — user must use password reset to set their own
      const bcrypt = await import('bcryptjs');
      const tempPassword = crypto.randomUUID() + crypto.randomUUID(); // Unguessable
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      invitedUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          password: hashedPassword, // Random — user must reset via email
        },
      });
    }

    // Check if already a member
    if (team.members.some(m => m.id === invitedUser.id)) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      );
    }

    // Add member to team
    await prisma.team.update({
      where: { id: teamId },
      data: {
        members: {
          connect: { id: invitedUser.id },
        },
      },
    });

    // Auto-provision API key for new team member (if they don't have one)
    const existingKey = await prisma.event.findFirst({
      where: { userId: invitedUser.id, eventName: 'api_key_created' },
    }).catch(() => null);

    if (!existingKey) {
      // Create a team-scoped API key for the member
      const crypto = await import('crypto');
      const rawKey = `fk_${crypto.randomUUID().replace(/-/g, '')}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      await prisma.event.create({
        data: {
          userId: invitedUser.id,
          email: invitedUser.email,
          eventName: 'api_key_created',
          eventData: {
            keyPrefix: rawKey.slice(0, 8),
            teamId,
            teamName: team.name,
            autoProvisioned: true,
          },
        },
      }).catch(() => null); // Non-blocking — key provisioning shouldn't fail the invite
    }

    // Send invitation email
    try {
      await sendTeamInviteEmail(
        invitedUser.email,
        team.name,
        session.user.name || session.user.email || 'Someone',
        `https://fortress-optimizer.com/teams/invitations/${teamId}`
      );
    } catch (emailError) {
      console.error('Failed to send team invite email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Team member added successfully',
      member: {
        id: invitedUser.id,
        email: invitedUser.email,
        name: invitedUser.name,
      },
    });
  } catch (error) {
    console.error('POST /api/teams/:teamId/members error:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}
