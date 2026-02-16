import { NextRequest, NextResponse } from 'next/server';

function calculatePasswordStrength(password: string): { score: number; feedback: string[] } {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 20;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  else feedback.push('Add special characters');

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeated characters');
  }

  if (/^[a-z]+[0-9]+$|^[0-9]+[a-z]+$/i.test(password)) {
    score -= 5;
    feedback.push('Mix character types throughout');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    feedback,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }

    const { score, feedback } = calculatePasswordStrength(password);

    return NextResponse.json({
      score,
      feedback,
      isValid: score >= 60,
    });
  } catch (error) {
    console.error('Password validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
