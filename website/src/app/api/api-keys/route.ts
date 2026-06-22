/**
 * API Keys Management — Proxies to the real backend API.
 * GET  /api/api-keys - List keys
 * POST /api/api-keys - Provision a free API key for the authenticated user.
 *
 * NOTE: the backend's anonymous POST /api/keys/register was removed. Key
 * minting is now identity-gated. This route forwards to the new
 * POST /api/keys/provision contract using the authenticated user's id as the
 * account_id, with the server-only X-Provision-Secret header.
 *
 * For the OAuth-gated, one-free-key-per-user claim flow used by the dashboard,
 * see POST /api/keys/claim-free.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserIdFromRequest } from '@/lib/jwt-auth';
import { prisma } from '@/lib/prisma';
import { sendFreeKeyEmail } from '@/lib/email';

const BACKEND_API =
  process.env.FORTRESS_API_URL ||
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.fortress-optimizer.com';

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
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const keyName = body.name || body.key_name || `free-${userId}`;

    // Identity gate (same rules as /api/keys/claim-free): free keys require an
    // OAuth (google/github) account and are limited to ONE per user. This route
    // must not be a weaker second provisioning path.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        freeKeyClaimedAt: true,
        accounts: { select: { provider: true, type: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const hasOAuth = user.accounts.some(
      (a) => a.type === 'oauth' && (a.provider === 'google' || a.provider === 'github')
    );
    if (!hasOAuth) {
      return NextResponse.json(
        {
          error: 'oauth_required',
          message:
            'Free API keys require signing in with Google or GitHub, or upgrade to a paid plan.',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }
    if (user.freeKeyClaimedAt) {
      return NextResponse.json(
        {
          error: 'free_key_already_claimed',
          message: 'You have already claimed your free API key. Upgrade to Pro for more.',
          upgradeUrl: '/pricing',
        },
        { status: 409 }
      );
    }

    // Server-only provisioning secret — fail closed if unset.
    const provisionSecret = process.env.PROVISION_SECRET;
    if (!provisionSecret) {
      console.error('api-keys: PROVISION_SECRET is not configured', {
        event: 'free_provision_misconfigured',
      });
      return NextResponse.json(
        { error: 'Provisioning is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // Call the backend provisioning endpoint (replaces the removed
    // anonymous /api/keys/register path).
    const backendRes = await fetch(`${BACKEND_API}/api/keys/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Provision-Secret': provisionSecret,
      },
      body: JSON.stringify({ name: keyName, tier: 'free', account_id: userId }),
    });

    if (!backendRes.ok) {
      const err = await backendRes
        .json()
        .catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(
        { error: err.detail || 'Failed to generate API key' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    // Record the one-free-key claim (race-safe: conditional on not-yet-claimed).
    await prisma.user
      .update({
        where: { id: userId, freeKeyClaimedAt: null },
        data: {
          freeKeyClaimedAt: new Date(),
          freeKeyHash: crypto.createHash('sha256').update(data.api_key).digest('hex'),
        },
      })
      .catch(() => null);

    // Email the key (fire-and-forget) — only recovery copy (backend stores a hash).
    if (user.email) {
      sendFreeKeyEmail(user.email, data.api_key).catch((e) =>
        console.error('free-key email failed:', e)
      );
    }

    const response = NextResponse.json(
      {
        id: data.api_key,
        key_id: data.api_key,
        name: keyName,
        key: data.api_key,
        apiKey: data.api_key,
        tier: data.tier,
        createdAt: new Date().toISOString(),
        message: 'Save this API key — you will not be able to see it again.',
      },
      { status: 201 }
    );

    // Store the API key in a cookie so the dashboard can fetch usage stats.
    response.cookies.set('fortress_api_key', data.api_key, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
