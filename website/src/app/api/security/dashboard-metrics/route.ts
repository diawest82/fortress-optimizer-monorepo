import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Mock data - replace with actual database queries
  const metrics = {
    totalLogins: 1243,
    failedLogins: 23,
    mfaAdoptionRate: 42,
    passwordChanges: 87,
    suspiciousActivities: 5,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(metrics);
}
