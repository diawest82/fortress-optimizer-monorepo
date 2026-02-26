// API route for tracking page visits and events
// File: src/app/api/analytics/track/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface TrackEventRequest {
  eventName: string;
  userId?: string;
  email?: string;
  eventData?: Record<string, any>;
  source?: string;
  page?: string;
  referrer?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
}

export async function POST(req: NextRequest) {
  try {
    const data: TrackEventRequest = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Track event
    const event = await prisma.event.create({
      data: {
        userId: data.userId,
        email: data.email,
        eventName: data.eventName,
        eventData: data.eventData || {},
        source: data.source || data.utm_source,
        page: data.page,
        referrer: data.referrer,
        ipAddress: clientIp,
        userAgent,
      },
    });

    // If it's a signup event, create UserSignup record
    if (data.eventName === 'signup' && data.email) {
      await prisma.userSignup.upsert({
        where: { email: data.email },
        update: {},
        create: {
          email: data.email,
          source: data.source || data.utm_source || 'direct',
          campaign: data.utm_campaign,
          medium: data.utm_medium,
          referrer: data.referrer,
          ipAddress: clientIp,
          userAgent,
          conversionStatus: 'signup',
        },
      });
    }

    // If it's a first action event, update UserSignup
    if (data.eventName === 'first_optimization_completed' && (data.userId || data.email)) {
      await prisma.userSignup.updateMany({
        where: data.userId ? { userId: data.userId } : { email: data.email },
        data: {
          conversionStatus: 'first_action',
          firstActionAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Tracking error:', error);
    // Don't fail the user's request if tracking fails
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
