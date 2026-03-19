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
      const result = await signup(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`);
      if (result) {
        // Signup successful, redirect to dashboard
        router.push('/dashboard');
      }
      // If result is null, signup failed — error shown via authError state
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold mb-3">Join Early Access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-slate-300">Stop wasting tokens on verbose prompts. Sign up now and save 20% instantly.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} method="post" action="" className="space-y-4">
          {/* Error message */}
          {/* OAuth signup */}
          <button
            type="button"
            onClick={() => window.location.assign('/api/auth/signin/github?callbackUrl=/account')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Continue with GitHub
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-black px-2 text-slate-500">or sign up with email</span></div>
          </div>

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
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                aria-invalid={!!fieldErrors.firstName}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
              {fieldErrors.firstName && (
                <p id="firstName-error" role="alert" className="text-red-400 text-sm mt-1">{fieldErrors.firstName}</p>
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
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                aria-invalid={!!fieldErrors.lastName}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
              {fieldErrors.lastName && (
                <p id="lastName-error" role="alert" className="text-red-400 text-sm mt-1">{fieldErrors.lastName}</p>
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
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
            />
            {fieldErrors.email && (
              <p id="signup-email-error" role="alert" className="text-red-400 text-sm mt-1">{fieldErrors.email}</p>
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
              aria-describedby={fieldErrors.password ? 'signup-password-error' : 'password-strength'}
              aria-invalid={!!fieldErrors.password}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
            />
            {formData.password.length > 0 && (
              <div id="password-strength" className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => {
                    const len = formData.password.length;
                    const hasUpper = /[A-Z]/.test(formData.password);
                    const hasLower = /[a-z]/.test(formData.password);
                    const hasNum = /[0-9]/.test(formData.password);
                    const hasSpecial = /[!@#$%^&*()_+=\-\[\]{};:'",.<>?/\\|`~]/.test(formData.password);
                    const score = (len >= 8 ? 1 : 0) + (hasUpper && hasLower ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);
                    const color = i <= score
                      ? score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-amber-500' : score <= 3 ? 'bg-emerald-400' : 'bg-emerald-500'
                      : 'bg-zinc-700';
                    return <div key={i} className={`h-1 flex-1 rounded ${color}`} />;
                  })}
                </div>
                <p className={`text-xs mt-1 ${
                  formData.password.length < 8 ? 'text-red-400' :
                  /[!@#$%^&*()_+=\-\[\]{};:\'".,<>?/\\|`~]/.test(formData.password) ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {formData.password.length < 8 ? 'Too short — need 8+ characters' :
                   !/[!@#$%^&*()_+=\-\[\]{};:\'".,<>?/\\|`~]/.test(formData.password) ? 'Add a special character (!@#$...)' :
                   'Strong password'}
                </p>
              </div>
            )}
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
