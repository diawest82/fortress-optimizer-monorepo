/**
 * Token Optimization API
 * POST /api/optimize - Optimize tokens for given text
 */

import { NextRequest, NextResponse } from 'next/server';

interface OptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  savingsPercent: number;
  optimizedText: string;
}

function countTokens(text: string): number {
  // Rough estimation: ~1 token per 4 characters
  return Math.ceil(text.length / 4);
}

function optimizeText(text: string): string {
  // Simple optimization: remove extra whitespace, condense common phrases
  let optimized = text
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\.\s*\./g, '...')
    .trim();

  // Remove common verbose patterns
  const replacements: Record<string, string> = {
    'in order to': 'to',
    'is able to': 'can',
    'at the present time': 'now',
    'in the event that': 'if',
    'due to the fact that': 'because',
  };

  Object.entries(replacements).forEach(([verbose, concise]) => {
    optimized = optimized.replace(new RegExp(verbose, 'gi'), concise);
  });

  return optimized;
}

export async function POST(req: NextRequest) {
  try {
    // Allow public access to optimization - no auth required for MVP
    const { text, provider, model } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!provider || !model) {
      return NextResponse.json(
        { error: 'Provider and model are required' },
        { status: 400 }
      );
    }

    // Count original tokens
    const originalTokens = countTokens(text);

    // Optimize the text
    const optimizedText = optimizeText(text);

    // Count optimized tokens
    const optimizedTokens = countTokens(optimizedText);

    // Calculate savings
    const savings = originalTokens - optimizedTokens;
    const savingsPercent = (savings / originalTokens) * 100;

    return NextResponse.json({
      originalTokens,
      optimizedTokens,
      tokensSaved: savings,
      savingsPercent: Math.round(savingsPercent * 100) / 100,
      optimizedText,
      provider,
      model,
      timestamp: new Date(),
    } as OptimizationResult & { provider: string; model: string; timestamp: Date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to optimize tokens';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
