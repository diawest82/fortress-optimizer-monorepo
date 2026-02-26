'use client';

import { useEffect, useState } from 'react';
import { Lock, Shield, Smartphone, Calendar, AlertCircle } from 'lucide-react';

interface SecurityMetrics {
  passwordStrength: number;
  mfaEnabled: boolean;
  activeSessions: number;
  accountAge: number;
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/security/metrics');
      
      if (!response.ok) {
        throw new Error('Failed to fetch security metrics');
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score < 30) return 'bg-red-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 80) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getPasswordStrengthLabel = (score: number) => {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 80) return 'Good';
    return 'Strong';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl border border-slate-800 bg-slate-950/50 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl border border-slate-800 bg-slate-950/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-100">{error || 'Failed to load metrics'}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 text-sm text-red-200 hover:text-red-100 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Password Strength Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8">
        <div className="flex items-start justify-between gap-6 md:flex-row">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-400" />
              <p className="text-sm uppercase tracking-widest text-emerald-200">Password Strength</p>
            </div>
            <p className="mt-4 text-5xl font-bold text-white">{metrics.passwordStrength}</p>
            <p className="mt-2 text-lg text-emerald-100">
              {getPasswordStrengthLabel(metrics.passwordStrength)}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Update your password regularly to maintain account security. Use a mix of uppercase, lowercase, numbers, and symbols.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(metrics.passwordStrength / 100) * 283} 283`}
                  className={`${getPasswordStrengthColor(
                    metrics.passwordStrength
                  )} transition-all duration-500`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{metrics.passwordStrength}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* MFA Status Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-slate-400" />
                <p className="text-xs uppercase tracking-widest text-slate-500">Two-Factor Auth</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {metrics.mfaEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                metrics.mfaEnabled ? 'bg-emerald-500/20' : 'bg-yellow-500/20'
              }`}
            >
              <Shield className={`h-6 w-6 ${metrics.mfaEnabled ? 'text-emerald-400' : 'text-yellow-400'}`} />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {metrics.mfaEnabled
              ? 'Your account has enhanced security enabled'
              : 'Enable 2FA to protect your account'}
          </p>
        </div>

        {/* Active Sessions Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-slate-400" />
                <p className="text-xs uppercase tracking-widest text-slate-500">Active Sessions</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{metrics.activeSessions}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-400">{metrics.activeSessions}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            You have {metrics.activeSessions} active session{metrics.activeSessions !== 1 ? 's' : ''} across devices
          </p>
        </div>

        {/* Account Age Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-400" />
                <p className="text-xs uppercase tracking-widest text-slate-500">Account Age</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{metrics.accountAge} days</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Your account has been with us for {metrics.accountAge} days
          </p>
        </div>
      </div>
    </div>
  );
}
