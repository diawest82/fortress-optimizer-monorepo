'use client';

import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface BackupCodesDisplayProps {
  codes: string[];
  onConfirm: () => void;
  onBack: () => void;
}

export default function BackupCodesDisplay({
  codes,
  onConfirm,
  onBack,
}: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const downloadCodes = () => {
    const text = codes.join('\n');
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    );
    element.setAttribute('download', 'fortress-backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async () => {
    const text = codes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-300 mb-4">
          Save these backup codes in a safe place. Each code can be used once if you lose access to your authenticator.
        </p>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-6 font-mono text-sm space-y-2">
          {codes.map((code, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-200">
              <span>{code}</span>
              <span className="text-xs text-slate-500">Code {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <p className="text-sm text-yellow-100">
          💾 Keep these codes safe. Store them in a password manager or secure location. You&apos;ll need them if you lose access to your authenticator app.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={downloadCodes}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 transition"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 transition"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 transition"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition"
        >
          I&apos;ve Saved My Codes
        </button>
      </div>
    </div>
  );
}
