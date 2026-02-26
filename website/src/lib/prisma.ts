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
    return 'prisma+postgres://accelerate.prisma-data.net/?api_key=REDACTED_PRISMA_KEY';
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
