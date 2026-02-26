// A/B Testing utilities
// File: src/lib/automation/ab-testing.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Assign user to experiment variant
 */
export async function assignUserToVariant(
  experimentId: string,
  userId?: string,
  sessionId?: string
) {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: true },
  });

  if (!experiment || experiment.status !== 'running') {
    return null;
  }

  // Randomly assign based on allocation percentages
  const rand = Math.random() * 100;
  let allocated = 0;

  for (const variant of experiment.variants) {
    allocated += variant.allocationPercentage;
    if (rand <= allocated) {
      const assignment = await prisma.experimentAssignment.create({
        data: {
          experimentId,
          variantId: variant.id,
          userId,
          sessionId,
        },
      });

      return {
        variantId: variant.id,
        variantName: variant.name,
        changes: variant.changes,
      };
    }
  }

  return null;
}

/**
 * Record conversion for experiment
 */
export async function recordExperimentConversion(assignmentId: string) {
  const assignment = await prisma.experimentAssignment.update({
    where: { id: assignmentId },
    data: { converted: true },
  });

  // Update variant conversion metrics
  if (assignment) {
    const variant = await prisma.experimentVariant.findUnique({
      where: { id: assignment.variantId },
    });

    if (variant) {
      const conversionRate =
        ((variant.conversions + 1) / (variant.views + 1)) * 100;

      await prisma.experimentVariant.update({
        where: { id: assignment.variantId },
        data: {
          conversions: variant.conversions + 1,
          conversionRate: parseFloat(conversionRate.toFixed(4)),
        },
      });
    }
  }

  return assignment;
}

/**
 * Calculate statistical significance
 */
export function calculateStatisticalSignificance(
  variant1: { conversions: number; views: number },
  variant2: { conversions: number; views: number }
) {
  const p1 = variant1.conversions / variant1.views;
  const p2 = variant2.conversions / variant2.views;

  const pooled = (variant1.conversions + variant2.conversions) / (variant1.views + variant2.views);

  const se = Math.sqrt(pooled * (1 - pooled) * (1 / variant1.views + 1 / variant2.views));

  const z = (p1 - p2) / se;

  // 1.96 is 95% confidence interval
  const isSignificant = Math.abs(z) > 1.96;

  return {
    zScore: parseFloat(z.toFixed(4)),
    isSignificant,
    confidence: isSignificant ? '95%' : 'Not statistically significant',
  };
}

/**
 * Get experiment results
 */
export async function getExperimentResults(experimentId: string) {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: true },
  });

  if (!experiment) return null;

  const variants = experiment.variants.map(v => ({
    id: v.id,
    name: v.name,
    views: v.views,
    conversions: v.conversions,
    conversionRate: v.conversionRate,
  }));

  if (variants.length >= 2) {
    const significance = calculateStatisticalSignificance(variants[0], variants[1]);

    return {
      experimentId,
      experimentName: experiment.name,
      status: experiment.status,
      variants,
      winner: variants.sort((a, b) => b.conversionRate - a.conversionRate)[0],
      significanceTest: significance,
    };
  }

  return {
    experimentId,
    experimentName: experiment.name,
    status: experiment.status,
    variants,
  };
}

/**
 * End experiment and recommend winner
 */
export async function concludeExperiment(experimentId: string) {
  const results = await getExperimentResults(experimentId);

  if (!results) return null;

  const updated = await prisma.experiment.update({
    where: { id: experimentId },
    data: { status: 'completed', endedAt: new Date() },
  });

  return {
    experiment: updated,
    results,
    recommendation:
      results.significanceTest?.isSignificant
        ? `${results.winner?.name} is the clear winner with ${results.winner?.conversionRate.toFixed(2)}% conversion rate`
        : 'Results are not statistically significant yet',
  };
}
