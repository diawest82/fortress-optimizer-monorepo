/** @type {import('next').NextConfig} */

// Load environment variables explicitly for production
if (process.env.NODE_ENV === 'production') {
  // Ensure DATABASE_URL is available at build/runtime
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgres://ebe7b9fdb7b1c89c0447d39e00aaf1b3a1d83db90a6014c23cc21db252a4c854:sk_hfDIAJVXZeEnRxAxHEh8p@db.prisma.io:5432/postgres?sslmode=require';
  }
  if (!process.env.PRISMA_DATABASE_URL) {
    process.env.PRISMA_DATABASE_URL = 'prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19oZkRJQUpWWFplRW5SeEF4SEVoOHAiLCJhcGlfa2V5IjoiMDFLSE4yTllDQzk0NFY5WjRNUENXN1IyRDkiLCJ0ZW5hbnRfaWQiOiJlYmU3YjlmZGI3YjFjODljMDQ0N2QzOWUwMGFhZjFiM2ExZDgzZGI5MGE2MDE0YzIzY2MyMWRiMjUyYTRjODU0IiwiaW50ZXJuYWxfc2VjcmV0IjoiNjg1N2VlMjYtYzA4MC00ZWJmLWI5OGYtNTk4Mzc4NjI3YmNjIn0.CkuIfsT_Vpe5tvir3Jqr_ch07UY1piJr899KQ3ujc4Q';
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
        value: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
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
            value: 'max-age=63072000; includeSubDomains',
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
