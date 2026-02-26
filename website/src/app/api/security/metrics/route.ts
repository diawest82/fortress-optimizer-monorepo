import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Mock data - replace with actual database queries
  const metrics = {
    passwordStrength: 75,
    mfaEnabled: false,
    activeSessions: 2,
    accountAge: 45,
  };

  return NextResponse.json(metrics);
}
