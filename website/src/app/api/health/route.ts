import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as health`;
    
    return NextResponse.json({
      status: '✅ HEALTHY',
      DATABASE: '✅ CONNECTED',
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: '❌ UNHEALTHY',
        DATABASE: '❌ NOT CONNECTED',
        error: error instanceof Error ? error.message : 'Unknown error',
        NODE_ENV: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
