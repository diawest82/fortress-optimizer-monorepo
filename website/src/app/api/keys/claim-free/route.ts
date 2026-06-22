/**
 * POST /api/keys/claim-free
 *
 * Claim the ONE free Fortress API key tied to an authenticated OAuth account.
 *
 * Rules (each free key costs real AWS infra money, so the free tier is
 * identity-gated and bounded):
 *   - Must have a NextAuth session.
 *   - Must have signed in via an OAuth provider (google or github). Credentials-
 *     only users get 403 with a message to use Google/GitHub or upgrade.
 *   - Exactly ONE free key per user. If freeKeyClaimedAt is already set -> 409
 *     with an upgrade CTA.
 *   - Otherwise call the BACKEND POST /api/keys/provision with the server-only
 *     X-Provision-Secret header, persist freeKeyClaimedAt + freeKeyHash, and
 *     return the raw api_key ONCE (it cannot be retrieved again).
 *
 * SECURITY: PROVISION_SECRET is server-only. It is never NEXT_PUBLIC and is
 * never returned to the client.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';
import { authConfig } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { sendFreeKeyEmail } from '@/lib/email';

// Server-side backend base URL. NEXT_PUBLIC_API_URL is readable here too (it's
// just an env var on the server), but FORTRESS_API_URL takes precedence.
const BACKEND_API =
  process.env.FORTRESS_API_URL ||
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.fortress-optimizer.com';

export async function POST() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Load the user + their linked OAuth accounts.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        freeKeyClaimedAt: true,
        accounts: { select: { provider: true, type: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Require an OAuth (google/github) linked account. Credentials-only users
    // cannot claim a free key — they must sign in with an OAuth provider or
    // upgrade to a paid plan.
    const hasOAuth = user.accounts.some(
      (a) =>
        a.type === 'oauth' &&
        (a.provider === 'google' || a.provider === 'github')
    );

    if (!hasOAuth) {
      return NextResponse.json(
        {
          error: 'oauth_required',
          message:
            'Free API keys require signing in with Google or GitHub. ' +
            'Sign in with an OAuth provider, or upgrade to a paid plan.',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Enforce ONE free key per user.
    if (user.freeKeyClaimedAt) {
      return NextResponse.json(
        {
          error: 'free_key_already_claimed',
          message:
            'You have already claimed your free API key. ' +
            'Upgrade to Pro for unlimited usage.',
          claimedAt: user.freeKeyClaimedAt,
          upgradeUrl: '/pricing',
        },
        { status: 409 }
      );
    }

    // Server-only provisioning secret — fail closed if unset.
    const provisionSecret = process.env.PROVISION_SECRET;
    if (!provisionSecret) {
      console.error('claim-free: PROVISION_SECRET is not configured', {
        event: 'free_provision_misconfigured',
      });
      return NextResponse.json(
        { error: 'Provisioning is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // Provision the free key on the backend. account_id = website user id so
    // the backend can enforce one active free key per account at its DB level.
    let backendRes: Response;
    try {
      backendRes = await fetch(`${BACKEND_API}/api/keys/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provision-Secret': provisionSecret,
        },
        body: JSON.stringify({
          name: `free-${userId}`,
          tier: 'free',
          account_id: userId,
        }),
      });
    } catch (err) {
      console.error('claim-free: backend unreachable', err);
      return NextResponse.json(
        { error: 'Provisioning service is temporarily unavailable.' },
        { status: 502 }
      );
    }

    if (!backendRes.ok) {
      const detail = await backendRes
        .json()
        .catch(() => ({ detail: 'Backend error' }));

      // Backend already had a free key for this account (e.g. claim raced or a
      // prior local write was lost). Treat as already-claimed and reconcile our
      // own record so the UI is consistent.
      if (backendRes.status === 409) {
        await prisma.user
          .update({
            where: { id: userId, freeKeyClaimedAt: null },
            data: { freeKeyClaimedAt: new Date() },
          })
          .catch(() => null);
        return NextResponse.json(
          {
            error: 'free_key_already_claimed',
            message:
              'A free API key has already been provisioned for this account. ' +
              'Upgrade to Pro for unlimited usage.',
            upgradeUrl: '/pricing',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: detail.detail || 'Failed to provision free API key' },
        { status: backendRes.status }
      );
    }

    const data: { api_key: string; tier: string; account_id: string } =
      await backendRes.json();

    const keyHash = crypto
      .createHash('sha256')
      .update(data.api_key)
      .digest('hex');

    // Persist the claim. Conditional on freeKeyClaimedAt: null so two
    // concurrent claims can't both succeed.
    try {
      await prisma.user.update({
        where: { id: userId, freeKeyClaimedAt: null },
        data: { freeKeyClaimedAt: new Date(), freeKeyHash: keyHash },
      });
    } catch {
      // Lost the race — another request claimed first. The backend's unique
      // index guarantees only one free key exists, so just report already-claimed.
      return NextResponse.json(
        {
          error: 'free_key_already_claimed',
          message:
            'You have already claimed your free API key. ' +
            'Upgrade to Pro for unlimited usage.',
          upgradeUrl: '/pricing',
        },
        { status: 409 }
      );
    }

    // Email the key (fire-and-forget) — it's the user's only recovery copy
    // since the backend stores only a hash. Never blocks the response.
    sendFreeKeyEmail(session.user.email, data.api_key).catch((e) =>
      console.error('free-key email failed:', e)
    );

    const response = NextResponse.json(
      {
        api_key: data.api_key,
        tier: data.tier,
        message:
          'Save this API key now — you will not be able to see it again.',
      },
      { status: 201 }
    );

    // Store the key in an httpOnly cookie so the dashboard can fetch usage
    // stats (same pattern as the old /api/api-keys route).
    response.cookies.set('fortress_api_key', data.api_key, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to claim free API key';
    console.error('claim-free error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
