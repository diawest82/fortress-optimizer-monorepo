/**
 * Enterprise Emails Query
 * GET /api/emails/enterprise
 */

import { NextResponse } from 'next/server';
import { getEnterpriseQueries } from '@/lib/email-storage';

export async function GET() {
  try {
    const emails = await getEnterpriseQueries();
    return NextResponse.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('Error fetching enterprise emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enterprise emails' },
      { status: 500 }
    );
  }
}
