import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Save to database
    const team = await prisma.team.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        ownerId: session.user.id,
        members: {
          connect: [{ id: session.user.id }],
        },
      },
      include: { members: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Team created successfully',
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        memberCount: team.members.length,
      },
    });
  } catch (error) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's teams from database
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { id: session.user.id } } },
        ],
      },
      include: { members: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        memberCount: team.members.length,
        isOwner: team.ownerId === session.user.id,
      })),
    });
  } catch (error) {
    console.error('GET /api/teams error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
