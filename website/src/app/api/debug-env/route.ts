import { NextResponse } from 'next/server';

// TEMPORARY debug endpoint — remove after diagnosis.
// Returns shape/prefix of critical env vars (never the full value).
export async function GET() {
  const inspect = (name: string) => {
    const v = process.env[name];
    if (!v) return 'UNSET';
    return `len=${v.length}, prefix="${v.slice(0, 12)}", suffix="${v.slice(-4)}"`;
  };
  return NextResponse.json({
    STRIPE_SECRET_KEY: inspect('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: inspect('STRIPE_WEBHOOK_SECRET'),
    STRIPE_PRODUCT_ID_INDIVIDUAL: inspect('STRIPE_PRODUCT_ID_INDIVIDUAL'),
    STRIPE_PRODUCT_ID_TEAMS: inspect('STRIPE_PRODUCT_ID_TEAMS'),
    STRIPE_PRODUCT_ID_ENTERPRISE: inspect('STRIPE_PRODUCT_ID_ENTERPRISE'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: inspect('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    JWT_SECRET_set: !!process.env.JWT_SECRET,
    NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
