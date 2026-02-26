'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error: authError } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
  });

  const validateForm = () => {
    const errors = { email: '', password: '' };
    let isValid = true;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await login(formData.email, formData.password);
      // Login successful, redirect to dashboard (or callback URL)
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
    } catch (error) {
      // Error is handled by AuthContext and stored in authError
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold mb-3">🔐 Secure Access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Sign In</h1>
          <p className="text-slate-300">Welcome back! Access your token optimization dashboard and start saving immediately.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {authError}
            </div>
          )}

          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              autoComplete="current-password"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
            />
            {fieldErrors.password && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-lg transition"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-zinc-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 transition">
              Sign up
            </Link>
          </p>
          <p className="text-xs text-zinc-500">
            By logging in, you agree to our{' '}
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
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
