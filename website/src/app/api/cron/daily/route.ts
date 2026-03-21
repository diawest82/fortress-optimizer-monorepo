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

// GET returns cron health status only (no secret in URL)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    schedule: '0 6 * * * (daily at 6:00 UTC)',
    endpoint: 'POST /api/cron/daily',
  });
}
