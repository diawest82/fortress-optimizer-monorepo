'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Copy, Check } from 'lucide-react';

export interface TOTPSetupData {
  method: string;
  secret: string;
  qrCode: string;
}

interface TOTPSetupProps {
  method: string;
  onComplete: (data: TOTPSetupData) => void;
  onBack: () => void;
}

export default function TOTPSetup({ method, onComplete, onBack }: TOTPSetupProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateTOTP();
  }, []);

  const generateTOTP = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/mfa/totp-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      });

      if (!response.ok) throw new Error('Failed to generate TOTP');
      const data = await response.json();
      setSecret(data.secret);
      setQrCode(data.qrCodeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (secret && qrCode) {
      onComplete({
        method,
        secret,
        qrCode,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-64 rounded-lg bg-slate-950/50 animate-pulse" />
        <div className="h-12 rounded-lg bg-slate-950/50 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-100">{error}</p>
        <button
          onClick={generateTOTP}
          className="mt-4 text-sm text-red-200 hover:text-red-100 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-300 mb-4">
          Scan this QR code with your authenticator app, or enter the secret key manually.
        </p>
        
        {qrCode && (
          <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto">
            <Image src={qrCode} alt="QR Code" width={192} height={192} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Cannot scan? Enter this code manually
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-slate-200 break-all">
            {secret}
          </code>
          <button
            onClick={copyToClipboard}
            className="flex-shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 p-2.5 transition"
            title="Copy secret"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-slate-300" />
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 transition"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
