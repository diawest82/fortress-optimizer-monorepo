/**
 * Admin Settings API
 * GET  /api/admin/settings - Get current settings
 * POST /api/admin/settings - Update settings
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          enterpriseThreshold: 999,
          autoResponseEnabled: false,
          notifyOnEnterprise: true,
        },
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      enterpriseThreshold,
      autoResponseEnabled,
      defaultAutoResponse,
      notifyOnEnterprise,
      notifyEmail,
    } = body;

    // Get or create settings
    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          enterpriseThreshold: enterpriseThreshold ?? 999,
          autoResponseEnabled: autoResponseEnabled ?? false,
          defaultAutoResponse,
          notifyOnEnterprise: notifyOnEnterprise ?? true,
          notifyEmail,
        },
      });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...(enterpriseThreshold !== undefined && { enterpriseThreshold }),
          ...(autoResponseEnabled !== undefined && { autoResponseEnabled }),
          ...(defaultAutoResponse !== undefined && { defaultAutoResponse }),
          ...(notifyOnEnterprise !== undefined && { notifyOnEnterprise }),
          ...(notifyEmail !== undefined && { notifyEmail }),
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
