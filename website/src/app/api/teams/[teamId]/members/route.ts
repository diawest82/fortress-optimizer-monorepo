/**
 * Team Member Management
 * POST /api/teams/:teamId/members - Add member to team
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { checkTeamSeatLimit } from '@/lib/team-limits';
import { sendTeamInviteEmail } from '@/lib/email';

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
      invitedUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          password: '', // Temporary - user will set password on first login
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
