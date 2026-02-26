'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { Chrome, Github, Mail } from 'lucide-react';

export default function SignInPage() {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: 'google' | 'github') => {
    try {
      setLoading(provider);
      setError(null);
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">Sign In</h1>
            <p className="text-sm text-slate-400">
              Choose your preferred sign-in method
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-100">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 hover:bg-slate-900/50 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-slate-100 transition"
            >
              <Chrome className="h-5 w-5" />
              {loading === 'google' ? 'Signing in...' : 'Google'}
            </button>

            {/* GitHub */}
            <button
              onClick={() => handleSignIn('github')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 hover:bg-slate-900/50 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-slate-100 transition"
            >
              <Github className="h-5 w-5" />
              {loading === 'github' ? 'Signing in...' : 'GitHub'}
            </button>

            {/* Email */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 opacity-50 cursor-not-allowed px-6 py-3 text-sm font-semibold text-slate-100"
            >
              <Mail className="h-5 w-5" />
              Email (Coming Soon)
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900/50 px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 text-center">
              By signing in, you agree to our{' '}
              <Link href="/legal/terms" className="text-blue-400 hover:text-blue-300 transition">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300 transition">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
