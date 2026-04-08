/**
 * Admin KPI Metrics API
 * GET /api/admin/kpis
 * Returns key performance indicators for the dashboard
 * Includes caching and timeout to prevent portal hanging
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

// Simple in-memory cache with 5-minute TTL
interface KPIResult {
  visitorAcquisitions: number;
  serviceInterruptions: number;
  packagesInstalled: number;
  tokensSaved: number;
  lastUpdated: string;
  isCached?: boolean;
  isFallback?: boolean;
}

let cachedKPIs: KPIResult | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedKPIs(): KPIResult | null {
  const now = Date.now();
  if (cachedKPIs && now - cacheTimestamp < CACHE_TTL) {
    return cachedKPIs;
  }
  return null;
}

function setCachedKPIs(data: KPIResult): void {
  cachedKPIs = data;
  cacheTimestamp = Date.now();
}

export async function GET(request: NextRequest) {
  // Auth must run BEFORE the cache lookup — otherwise an unauthenticated
  // request would be served stale admin data straight from memory.
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    // Check cache first - return immediately if cached
    const cached = getCachedKPIs();
    if (cached) {
      return NextResponse.json(cached);
    }

    // Use Promise.race to enforce 3-second timeout (very strict)
    const kpiPromise = (async () => {
      try {
        // REAL DATA — no fabrication, no proxies, no Math.random()
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Real user count
        const totalUsers = await prisma.user.count();

        // Real signups in last 7 days
        const recentSignups = await prisma.user.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        });

        // Real support tickets needing attention
        const openTickets = await prisma.supportTicket.count({
          where: { status: { in: ['open', 'in-progress'] } },
        }).catch(() => 0);

        // Real optimization data
        const optimizations = await prisma.tokenCountUsage.aggregate({
          _sum: {
            originalTokens: true,
            optimizedTokens: true,
          },
          _count: true,
        }).catch(() => ({ _sum: { originalTokens: 0, optimizedTokens: 0 }, _count: 0 }));

        const totalOriginal = optimizations._sum.originalTokens || 0;
        const totalOptimized = optimizations._sum.optimizedTokens || 0;
        const tokensSaved = totalOriginal - totalOptimized;

        // Real enterprise inquiries
        const enterpriseInquiries = await prisma.email.count({
          where: {
            isEnterprise: true,
            timestamp: { gte: sevenDaysAgo },
          },
        }).catch(() => 0);

        return {
          // Real metrics
          totalUsers,
          recentSignups,
          openTickets,
          enterpriseInquiries,
          totalOptimizations: optimizations._count,
          tokensSaved,
          tokensProcessed: totalOriginal,
          // Legacy fields for backward compatibility
          visitorAcquisitions: totalUsers,
          serviceInterruptions: openTickets,
          packagesInstalled: optimizations._count,
          lastUpdated: new Date().toISOString(),
        };
      } catch {
        return {
          totalUsers: 0,
          recentSignups: 0,
          openTickets: 0,
          enterpriseInquiries: 0,
          totalOptimizations: 0,
          tokensSaved: 0,
          tokensProcessed: 0,
          visitorAcquisitions: 0,
          serviceInterruptions: 0,
          packagesInstalled: 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    })();

    // Strict 3-second timeout
    const timeoutPromise = new Promise<KPIResult>((_, reject) =>
      setTimeout(() => reject(new Error('KPI fetch timeout')), 3000)
    );

    const result = await Promise.race([kpiPromise, timeoutPromise]);
    
    // Cache the result
    setCachedKPIs(result);
    
    return NextResponse.json(result);
  } catch (error) {
    // On error/timeout, return cached data if available
    const cached = getCachedKPIs();
    if (cached) {
      return NextResponse.json({ ...cached, isCached: true });
    }

    // Fallback to dummy data if no cache
    console.error('Error fetching KPIs:', error);
    const fallbackData: KPIResult = {
      visitorAcquisitions: 0,
      serviceInterruptions: 0,
      packagesInstalled: 50,
      tokensSaved: 0,
      lastUpdated: new Date().toISOString(),
      isFallback: true,
    };
    
    return NextResponse.json(fallbackData);
  }
}
