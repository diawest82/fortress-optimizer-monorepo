'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface SetupData {
  method: string;
  secret?: string;
  qrCode?: string;
}

interface MFAVerificationProps {
  method: string;
  setupData: SetupData;
  onComplete: (codes: string[]) => void;
  onBack: () => void;
}

export default function MFAVerification({
  method,
  setupData,
  onComplete,
  onBack,
}: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError('Please enter a valid code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          setupData,
          method,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verification failed');
      }

      const data = await response.json();
      onComplete(data.backupCodes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-300 mb-4">
          Enter the 6-digit code from your authenticator app to verify setup.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-100">Verification Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-center text-2xl font-mono tracking-widest text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-100">{error}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 disabled:opacity-50 transition"
        >
          Back
        </button>
        <button
          onClick={handleVerify}
          disabled={loading || code.length < 6}
          className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
    </div>
  );
}
