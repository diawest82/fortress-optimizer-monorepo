import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export async function GET() {
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

    // Get all referrals for this user
    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: { referee: true }
    });

    const completed = referrals.filter(r => r.status === 'completed');
    const pending = referrals.filter(r => r.status === 'pending');
    const totalEarnings = completed.reduce((sum, r) => sum + r.rewardAmount, 0);

    // Get top referrers
    const allReferrals = await prisma.referral.findMany({
      where: { status: 'completed' },
      include: { referrer: true }
    });

    const grouped = new Map<string, { user: typeof allReferrals[0]['referrer']; count: number; earnings: number }>();

    allReferrals.forEach(r => {
      const existing = grouped.get(r.referrerId) || {
        user: r.referrer,
        count: 0,
        earnings: 0
      };
      existing.count++;
      existing.earnings += r.rewardAmount;
      grouped.set(r.referrerId, existing);
    });

    const topReferrers = Array.from(grouped.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item, index) => ({
        rank: index + 1,
        user: item.user.name || item.user.email,
        referrals: item.count,
        earnings: item.earnings,
        reward:
          index === 0
            ? '1 year free Pro (value: $120)'
            : index === 1
            ? '6 months free Pro (value: $60)'
            : index === 2
            ? '3 months free Pro (value: $30)'
            : ''
      }));

    return NextResponse.json({
      totalReferrals: referrals.length,
      completedReferrals: completed.length,
      pendingReferrals: pending.length,
      totalEarnings,
      topReferrers
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
