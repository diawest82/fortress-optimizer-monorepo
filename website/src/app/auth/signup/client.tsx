'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

function SignUpContent() {
  const router = useRouter();
  const { signup, error: authError } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const validateForm = () => {
    const errors = { email: '', password: '', firstName: '', lastName: '' };
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
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    // First name validation
    if (!formData.firstName) {
      errors.firstName = 'First name is required';
      isValid = false;
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
      isValid = false;
    }

    // Last name validation
    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
      isValid = false;
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
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
      await signup(formData.email, formData.password);
      // Signup successful, redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      // Error is handled by AuthContext and stored in authError
      console.error('Signup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = {
    weak: "text-red-500",
    medium: "text-amber-500",
    strong: "text-emerald-500",
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold mb-3">� Join Early Access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-slate-300">Stop wasting tokens on verbose prompts. Sign up now and save 20% instantly.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {authError}
            </div>
          )}

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                autoComplete="given-name"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
              {fieldErrors.firstName && (
                <p className="text-red-400 text-sm mt-1">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                autoComplete="family-name"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
              {fieldErrors.lastName && (
                <p className="text-red-400 text-sm mt-1">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

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
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/legal/terms" className="text-blue-400 hover:text-blue-300 transition">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300 transition">
              Privacy Policy
            </Link>.
          </p>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition">
              Log in
            </Link>
          </p>
        </div>

        {/* Free tier info */}
        <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-400">
            ✨ Start free with <strong>50,000 tokens/month</strong>. Upgrade anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUp() {
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
      <SignUpContent />
    </Suspense>
  );
}
