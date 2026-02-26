/**
 * Enterprise Account Management - Individual Account Operations
 * GET /api/enterprise/accounts/:id - Get enterprise account details
 * PATCH /api/enterprise/accounts/:id - Update enterprise account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const account = await prisma.enterpriseAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json({ error: 'Enterprise account not found' }, { status: 404 });
    }

    // Check permission via account manager
    if (account.accountManager !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error('GET /api/enterprise/accounts/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enterprise account' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();

    // Verify access
    const account = await prisma.enterpriseAccount.findUnique({
      where: { id },
      select: { accountManager: true },
    });

    if (!account || account.accountManager !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update account
    const updated = await prisma.enterpriseAccount.update({
      where: { id },
      data: {
        ...(updates.companyName && { companyName: updates.companyName }),
        ...(updates.accountManager && { accountManager: updates.accountManager }),
        ...(updates.slackChannel && { slackChannel: updates.slackChannel }),
        ...(updates.customIntegrations && { customIntegrations: updates.customIntegrations }),
        ...(typeof updates.onPremiseEnabled === 'boolean' && {
          onPremiseEnabled: updates.onPremiseEnabled,
        }),
        ...(updates.annualContractAmount && { annualContractAmount: updates.annualContractAmount }),
        ...(updates.supportLevel && { supportLevel: updates.supportLevel }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Enterprise account updated successfully',
      account: updated,
    });
  } catch (error) {
    console.error('PATCH /api/enterprise/accounts/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to update enterprise account' },
      { status: 500 }
    );
  }
}
