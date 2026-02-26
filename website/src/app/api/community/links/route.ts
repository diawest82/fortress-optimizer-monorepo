import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Fetch from database
    // const links = await prisma.communityLink.findMany({
    //   where: { isActive: true },
    // });

    const links = [
      {
        id: '1',
        platform: 'discord',
        url: 'https://discord.gg/fortress-optimizer',
        description: 'Chat with 2000+ community members',
        isActive: true,
      },
      {
        id: '2',
        platform: 'github',
        url: 'https://github.com/fortress-optimizer/discussions',
        description: 'GitHub Discussions for feature requests',
        isActive: true,
      },
      {
        id: '3',
        platform: 'twitter',
        url: 'https://twitter.com/fortress_opt',
        description: 'Follow for announcements and tips',
        isActive: true,
      },
      {
        id: '4',
        platform: 'forum',
        url: 'https://community.fortress-optimizer.com',
        description: 'Community forum with knowledge base',
        isActive: true,
      },
    ];

    return NextResponse.json({
      success: true,
      links,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch community links' },
      { status: 500 }
    );
  }
}
