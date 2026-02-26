import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // In production, delete the session from the database
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    console.error('Session revocation error:', error);
    return NextResponse.json(
      { error: 'Revocation failed' },
      { status: 500 }
    );
  }
}
