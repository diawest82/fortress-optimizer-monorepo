import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

async function getUserId(req: NextRequest): Promise<string | null> {
  // Try NextAuth session first
  const session = await getServerSession();
  if (session?.user?.id) return session.user.id;

  // Fallback: try custom JWT cookie
  const cookieToken = req.cookies.get('fortress_auth_token')?.value;
  if (cookieToken) {
    try {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
      const decoded = jwt.default.verify(cookieToken, secret) as { id: string };
      return decoded.id;
    } catch { /* invalid token */ }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
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
        ownerId: userId,
        members: {
          connect: [{ id: userId }],
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's teams from database
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { id: userId } } },
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
        isOwner: team.ownerId === userId,
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
