// Cron job API endpoint
// File: src/app/api/cron/daily/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { runDailyAutomation } from '@/lib/automation/cron';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyAutomation();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Automation failed', details: error },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyAutomation();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Automation failed' },
      { status: 500 }
    );
  }
}
