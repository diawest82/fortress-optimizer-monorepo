'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

export default function TeamSignUpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSeats = parseInt(searchParams.get('seats') || '5', 10);
  const callbackUrl = searchParams.get('callbackUrl') || '/pricing';
  const { signup, error: authError } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    teamName: '',
    seats: Math.max(1, Math.min(500, initialSeats)),
  });
  const [fieldErrors, setFieldErrors] = useState({
    email: '', password: '', firstName: '', lastName: '', teamName: '',
  });

  const validateForm = () => {
    const errors = { email: '', password: '', firstName: '', lastName: '', teamName: '' };
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) { errors.email = 'Email is required'; isValid = false; }
    else if (!emailRegex.test(formData.email)) { errors.email = 'Please enter a valid email'; isValid = false; }

    if (!formData.password) { errors.password = 'Password is required'; isValid = false; }
    else if (formData.password.length < 8) { errors.password = 'Password must be at least 8 characters'; isValid = false; }
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) { errors.password = 'Password must include a special character'; isValid = false; }

    if (!formData.firstName) { errors.firstName = 'First name is required'; isValid = false; }
    else if (formData.firstName.length < 2) { errors.firstName = 'First name must be at least 2 characters'; isValid = false; }

    if (!formData.lastName) { errors.lastName = 'Last name is required'; isValid = false; }
    else if (formData.lastName.length < 2) { errors.lastName = 'Last name must be at least 2 characters'; isValid = false; }

    if (!formData.teamName) { errors.teamName = 'Team name is required'; isValid = false; }
    else if (formData.teamName.length < 2) { errors.teamName = 'Team name must be at least 2 characters'; isValid = false; }

    setFieldErrors(errors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await signup(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`);
      if (result) {
        // Store team info for post-signup setup
        if (typeof window !== 'undefined') {
          localStorage.setItem('pending_team', JSON.stringify({
            name: formData.teamName,
            seats: formData.seats,
          }));
        }
        router.push(`${callbackUrl}?team_setup=true&seats=${formData.seats}`);
      }
    } catch (error) {
      console.error('Team signup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-300 font-semibold mb-3">Team Plan</p>
          <h1 className="text-3xl font-bold text-white mb-2">Create your team account</h1>
          <p className="text-slate-300">
            Set up Fortress for your team — {formData.seats} seat{formData.seats !== 1 ? 's' : ''} selected.
          </p>
        </div>

        <form onSubmit={handleSubmit} method="post" action="" className="space-y-4">
          {/* OAuth signup */}
          <button
            type="button"
            onClick={() => window.location.assign(`/api/auth/signin/github?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
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
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
              {authError}
            </div>
          )}

          {/* Team name */}
          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-slate-300 mb-1">Team name</label>
            <input
              id="teamName"
              name="teamName"
              type="text"
              value={formData.teamName}
              onChange={handleChange}
              placeholder="Acme Engineering"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              aria-invalid={!!fieldErrors.teamName}
              aria-describedby={fieldErrors.teamName ? 'teamName-error' : undefined}
            />
            {fieldErrors.teamName && <p id="teamName-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.teamName}</p>}
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-1">First name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Jane"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
              />
              {fieldErrors.firstName && <p id="firstName-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-1">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Smith"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
              />
              {fieldErrors.lastName && <p id="lastName-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@acme.com"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && <p id="email-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters with a special character"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && <p id="password-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.password}</p>}
          </div>

          {/* Seats display */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Team seats</span>
              <span className="text-lg font-semibold text-purple-300">{formData.seats}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              You can adjust seats after checkout on the pricing page.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Creating team...' : 'Create Team Account'}
          </button>

          {/* Terms */}
          <p className="text-xs text-slate-500 text-center">
            By signing up, you agree to our{' '}
            <Link href="/legal/terms" className="text-purple-400 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/legal/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>.
          </p>

          {/* Switch to individual */}
          <p className="text-center text-sm text-slate-400 mt-4">
            Looking for an individual plan?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:underline">Sign up here</Link>
          </p>

          {/* Already have account */}
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
