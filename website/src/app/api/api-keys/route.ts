/**
 * API Keys Management
 * GET /api/api-keys - List all API keys for user
 * POST /api/api-keys - Generate new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory store for API keys (replace with database in production)
const apiKeys: Map<string, {
  id: string;
  userId: string;
  key: string;
  name: string;
  createdAt: Date;
  lastUsed?: Date;
}> = new Map();

function extractUserIdFromToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return decoded.id;
  } catch {
    return null;
  }
}

function generateApiKey(): string {
  return 'fz_' + crypto.randomBytes(32).toString('hex');
}

export async function GET(req: NextRequest) {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all keys for this user (exclude the actual key value for security)
    const userKeys = Array.from(apiKeys.values())
      .filter(k => k.userId === userId)
      .map(k => ({
        id: k.id,
        name: k.name,
        keyPreview: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4),
        createdAt: k.createdAt,
        lastUsed: k.lastUsed,
      }));

    return NextResponse.json({
      keys: userKeys,
      count: userKeys.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list API keys';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    const keyId = crypto.randomUUID();
    const apiKey = generateApiKey();

    // Store the key
    apiKeys.set(keyId, {
      id: keyId,
      userId,
      key: apiKey,
      name,
      createdAt: new Date(),
    });

    return NextResponse.json({
      id: keyId,
      name,
      apiKey, // Only show full key once at creation
      createdAt: new Date(),
      message: 'Save this API key in a safe place. You will not be able to see it again.',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
