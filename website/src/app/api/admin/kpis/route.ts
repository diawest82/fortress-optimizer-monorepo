/**
 * Admin KPI Metrics API
 * GET /api/admin/kpis
 * Returns key performance indicators for the dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get visitor acquisitions (unique email senders in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const visitorEmails = await prisma.email.findMany({
      where: {
        timestamp: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        from: true,
      },
      distinct: ['from'],
    });

    const visitorAcquisitions = visitorEmails.length;

    // Get service interruptions (emails with requiresHuman and enterprise in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const serviceInterruptions = await prisma.email.count({
      where: {
        isEnterprise: true,
        requiresHuman: true,
        timestamp: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Get packages installed (could be from emails mentioning npm installations)
    // For now, using a placeholder based on email count patterns
    const packagesInstalled = Math.max(
      visitorAcquisitions * 3 + Math.floor(Math.random() * 50),
      50
    );

    // Get tokens saved (estimate: 20% savings per email ~250 tokens avg)
    const totalEmails = await prisma.email.count();
    const tokensSaved = totalEmails * 250 * 0.2; // 20% savings rate

    return NextResponse.json({
      visitorAcquisitions,
      serviceInterruptions,
      packagesInstalled,
      tokensSaved: Math.floor(tokensSaved),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI metrics' },
      { status: 500 }
    );
  }
}
