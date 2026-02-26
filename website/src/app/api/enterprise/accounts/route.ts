/**
 * Enterprise Account Management
 * POST /api/enterprise/accounts - Create enterprise account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      companyName,
      companyDomain,
      accountManager,
      primaryContact,
      primaryContactName,
      customIntegrations,
      onPremiseEnabled,
      annualContractAmount,
    } = await req.json();

    if (!companyName || !companyDomain || !primaryContact) {
      return NextResponse.json(
        { error: 'Company name, domain, and primary contact required' },
        { status: 400 }
      );
    }

    // Verify user tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });

    if (user?.tier !== 'enterprise') {
      return NextResponse.json(
        { error: 'Only Enterprise tier accounts can create enterprise accounts' },
        { status: 403 }
      );
    }

    // Create enterprise account
    const enterpriseAccount = await prisma.enterpriseAccount.create({
      data: {
        companyName,
        companyDomain,
        accountManager: accountManager || session.user.email || '',
        primaryContact,
        primaryContactName: primaryContactName,
        status: 'active',
        supportLevel: '24/7',
        onPremiseEnabled: onPremiseEnabled || false,
        customIntegrations: customIntegrations || [],
        annualContractAmount: annualContractAmount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Enterprise account created successfully',
      account: {
        id: enterpriseAccount.id,
        companyName: enterpriseAccount.companyName,
        status: enterpriseAccount.status,
      },
    });
  } catch (error) {
    console.error('POST /api/enterprise/accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to create enterprise account' },
      { status: 500 }
    );
  }
}
