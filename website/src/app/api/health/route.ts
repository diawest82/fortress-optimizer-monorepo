import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const prismaUrl = process.env.PRISMA_DATABASE_URL;
  
  return NextResponse.json({
    DATABASE_URL: dbUrl ? '✅ SET' : '❌ NOT SET',
    PRISMA_DATABASE_URL: prismaUrl ? '✅ SET' : '❌ NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
