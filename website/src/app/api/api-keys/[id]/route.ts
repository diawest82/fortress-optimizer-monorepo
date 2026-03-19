/**
 * Delete API Key
 * DELETE /api/api-keys/[id] - Delete an API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/jwt-auth';

// Note: This should use a database in production. For now using in-memory storage.
interface ApiKey {
  id: string;
  userId: string;
  key: string;
  name: string;
  createdAt: Date;
  lastUsed?: Date;
}

const apiKeys: Map<string, ApiKey> = new Map();



export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const key = apiKeys.get(keyId);

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Verify key belongs to user
    if (key.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the key
    apiKeys.delete(keyId);

    return NextResponse.json(
      { message: 'API key deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
