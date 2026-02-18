/**
 * Prisma Database Client
 * Singleton instance for database access
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// For production, hardcode the database URL since Vercel env vars aren't being injected
const getDatabaseUrl = () => {
  if (process.env.PRISMA_DATABASE_URL) {
    return process.env.PRISMA_DATABASE_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19oZkRJQUpWWFplRW5SeEF4SEVoOHAiLCJhcGlfa2V5IjoiMDFLSE4yTllDQzk0NFY5WjRNUENXN1IyRDkiLCJ0ZW5hbnRfaWQiOiJlYmU3YjlmZGI3YjFjODljMDQ0N2QzOWUwMGFhZjFiM2ExZDgzZGI5MGE2MDE0YzIzY2MyMWRiMjUyYTRjODU0IiwiaW50ZXJuYWxfc2VjcmV0IjoiNjg1N2VlMjYtYzA4MC00ZWJmLWI5OGYtNTk4Mzc4NjI3YmNjIn0.CkuIfsT_Vpe5tvir3Jqr_ch07UY1piJr899KQ3ujc4Q';
  }
  return process.env.DATABASE_URL;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
