import { NextResponse } from 'next/server';
import { PRICING, SAVINGS_DISPLAY, COMPANY } from '@/lib/pricing-config';

/**
 * Machine-readable pricing feed at /pricing.json — for agents and tools that
 * need structured pricing without scraping the human pricing page. Sourced from
 * the single source of truth (pricing-config.ts), so it never drifts.
 */
export const dynamic = 'force-static';

export function GET() {
  const body = {
    product: COMPANY.name,
    currency: 'USD',
    savings: {
      display: SAVINGS_DISPLAY,
      note: 'Measured token-savings range across optimization levels (conservative/balanced/aggressive). Verifiable per-request via the optimize API (compare tokens.original vs tokens.optimized).',
    },
    api: {
      base_url: 'https://api.fortress-optimizer.com',
      register_key: 'POST /api/keys/register',
      optimize: 'POST /api/optimize',
      usage: 'GET /api/usage',
      auth: 'Authorization: Bearer <api_key>',
    },
    tiers: [
      {
        id: 'free',
        name: PRICING.free.name,
        price_monthly: PRICING.free.monthly,
        tokens_per_month: PRICING.free.tokens,
        unlimited_tokens: PRICING.free.unlimited,
        credit_card_required: false,
        self_serve: true,
        features: PRICING.free.features,
      },
      {
        id: 'pro',
        name: PRICING.pro.name,
        price_monthly: PRICING.pro.monthly,
        price_monthly_annual: PRICING.pro.annual,
        unlimited_tokens: PRICING.pro.unlimited,
        features: PRICING.pro.features,
      },
      {
        id: 'teams',
        name: PRICING.teams.name,
        base_price_monthly: PRICING.teams.baseMonthly,
        base_seats: PRICING.teams.baseSeats,
        unlimited_tokens: PRICING.teams.unlimited,
        seat_tiers: PRICING.teams.seatTiers,
        features: PRICING.teams.features,
      },
      {
        id: 'enterprise',
        name: PRICING.enterprise.name,
        price_monthly: PRICING.enterprise.monthly,
        contact_email: PRICING.enterprise.contactEmail,
        status: PRICING.enterprise.status,
        features: PRICING.enterprise.features,
      },
    ],
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
