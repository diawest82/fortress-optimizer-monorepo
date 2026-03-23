/**
 * Team Usage API — Aggregate real usage across all team members
 * GET /api/teams/:teamId/usage?range=7d
 *
 * Returns:
 * - Team totals (tokens processed, saved, cost saved)
 * - Per-member breakdown (each member's individual usage)
 * - Daily chart data (team aggregate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const range = request.nextUrl.searchParams.get('range') || '7d';
    const daysMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[range] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Verify user is a team member
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { id: true, email: true, name: true } },
        owner: { select: { id: true, email: true, name: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isMember = team.members.some(m => m.id === session.user.id) || team.ownerId === session.user.id;
    if (!isMember) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Get all member IDs
    const memberIds = team.members.map(m => m.id);

    // Aggregate usage across all members
    const teamTotals = await prisma.tokenCountUsage.aggregate({
      where: {
        userId: { in: memberIds },
        createdAt: { gte: since },
      },
      _sum: {
        originalTokens: true,
        optimizedTokens: true,
      },
      _count: true,
      _avg: {
        savings: true,
      },
    });

    const totalOriginal = teamTotals._sum.originalTokens || 0;
    const totalOptimized = teamTotals._sum.optimizedTokens || 0;
    const totalSaved = totalOriginal - totalOptimized;
    const costSaved = totalSaved > 0 ? (totalSaved / 1000) * 0.003 : 0;

    // Per-member breakdown
    const memberUsage = await Promise.all(
      team.members.map(async (member) => {
        const usage = await prisma.tokenCountUsage.aggregate({
          where: {
            userId: member.id,
            createdAt: { gte: since },
          },
          _sum: {
            originalTokens: true,
            optimizedTokens: true,
          },
          _count: true,
          _avg: {
            savings: true,
          },
        });

        const memberOriginal = usage._sum.originalTokens || 0;
        const memberOptimized = usage._sum.optimizedTokens || 0;
        const memberSaved = memberOriginal - memberOptimized;

        return {
          id: member.id,
          email: member.email,
          name: member.name,
          role: member.id === team.ownerId ? 'owner' : 'member',
          tokensProcessed: memberOriginal,
          tokensSaved: memberSaved,
          optimizationCount: usage._count,
          avgSavings: Math.round((usage._avg.savings || 0) * 10) / 10,
          costSaved: memberSaved > 0 ? Math.round((memberSaved / 1000) * 0.003 * 100) / 100 : 0,
        };
      })
    );

    // Sort by tokens saved descending
    memberUsage.sort((a, b) => b.tokensSaved - a.tokensSaved);

    // Daily chart data (team aggregate)
    const dailyOptimizations = await prisma.tokenCountUsage.findMany({
      where: {
        userId: { in: memberIds },
        createdAt: { gte: since },
      },
      select: {
        originalTokens: true,
        optimizedTokens: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { original: number; optimized: number }>();
    for (const opt of dailyOptimizations) {
      const dayKey = opt.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dayKey) || { original: 0, optimized: 0 };
      existing.original += opt.originalTokens;
      existing.optimized += opt.optimizedTokens;
      dailyMap.set(dayKey, existing);
    }

    const dailyData = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
      original: data.original,
      optimized: data.optimized,
    }));

    return NextResponse.json({
      hasData: teamTotals._count > 0,
      teamName: team.name,
      memberCount: team.members.length,
      maxSeats: team.seats,
      range,

      // Team totals
      totalTokensProcessed: totalOriginal,
      totalTokensSaved: totalSaved,
      totalCostSaved: Math.round(costSaved * 100) / 100,
      totalOptimizations: teamTotals._count,
      avgSavingsPercent: Math.round((teamTotals._avg.savings || 0) * 10) / 10,

      // Per-member breakdown
      members: memberUsage,

      // Chart data
      dailyData,

      // Empty state
      emptyStateMessage: teamTotals._count > 0
        ? null
        : 'No team optimizations yet. Have team members install Fortress and start optimizing.',
    });
  } catch (error) {
    console.error('Team usage error:', error);
    return NextResponse.json({ error: 'Failed to load team usage' }, { status: 500 });
  }
}
