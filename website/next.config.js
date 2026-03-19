/** @type {import('next').NextConfig} */

// Production requires DATABASE_URL and PRISMA_DATABASE_URL set via Vercel env vars
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL not set in production environment');
  }
}

const nextConfig = {
  images: {
    unoptimized: true,
  },
  headers: async () => {
    const corsHeaders = [
      {
        key: 'Access-Control-Allow-Origin',
        value: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.fortress-optimizer.com',
      },
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization, X-CSRF-Token, X-API-Key',
      },
      {
        key: 'Access-Control-Allow-Credentials',
        value: 'true',
      },
      {
        key: 'Access-Control-Max-Age',
        value: '86400', // 24 hours
      },
    ];

    return [
      {
        source: '/api/:path*',
        headers: [
          ...corsHeaders,
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.fortress-optimizer.com https://js.stripe.com https://us.i.posthog.com; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
