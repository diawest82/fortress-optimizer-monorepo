/**
 * Individual Email Management API
 * Endpoints for specific email operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getEmail,
  updateEmailStatus,
} from '@/lib/email-storage';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/emails/[id]
 * Get a specific email by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const email = await getEmail(id);

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/emails/[id]
 * Update email status or properties
 * Body:
 * {
 *   status?: 'unread' | 'read' | 'replied' | 'archived'
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status field is required' },
        { status: 400 }
      );
    }

    const updated = await updateEmailStatus(id, status);

    if (!updated) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email: updated,
    });
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
}
