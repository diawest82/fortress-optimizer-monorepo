/**
 * API Keys Management — Proxies to the real backend API
 * GET /api/api-keys - List keys
 * POST /api/api-keys - Generate new key (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/jwt-auth';

const BACKEND_API = process.env.BACKEND_API_URL || 'https://api.fortress-optimizer.com';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ keys: [], count: 0 });
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    const hasCookie = !!req.cookies.get('fortress_auth_token')?.value;
    const hasNextAuth = !!req.cookies.get('next-auth.session-token')?.value;
    console.log(`[api-keys] POST auth debug: userId=${userId}, hasFortressCookie=${hasCookie}, hasNextAuthCookie=${hasNextAuth}, secret_set=${!!process.env.NEXTAUTH_SECRET}`);

    if (!userId) {
      return NextResponse.json({
        error: 'Unauthorized',
        debug: { hasFortressCookie: hasCookie, hasNextAuthCookie: hasNextAuth, secretSet: !!process.env.NEXTAUTH_SECRET }
      }, { status: 401 });
    }

    const body = await req.json();
    const keyName = body.name || body.key_name || 'my-key';

    // Call the real backend to register the key
    const backendRes = await fetch(`${BACKEND_API}/api/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: keyName, tier: 'free' }),
    });

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(
        { error: err.detail || 'Failed to generate API key' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json({
      id: data.api_key,
      key_id: data.api_key,
      name: keyName,
      key: data.api_key,
      apiKey: data.api_key,
      tier: data.tier,
      rate_limits: data.rate_limits,
      createdAt: new Date().toISOString(),
      message: 'Save this API key — you will not be able to see it again.',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
