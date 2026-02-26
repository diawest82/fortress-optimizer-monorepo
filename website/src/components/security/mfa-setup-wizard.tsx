'use client';

import { useState } from 'react';
import { ChevronRight, CheckCircle, Smartphone, Mail } from 'lucide-react';
import TOTPSetup, { type TOTPSetupData } from './mfa/totp-setup';
import MFAVerification from './mfa/mfa-verification';
import BackupCodesDisplay from './mfa/backup-codes-display';

type MFAStep = 'method' | 'setup' | 'verify' | 'backup' | 'complete';
type MFAMethod = 'totp' | 'sms' | 'email';

interface SetupData extends TOTPSetupData {
  method: MFAMethod;
}

export default function MFASetupWizard() {
  const [step, setStep] = useState<MFAStep>('method');
  const [method, setMethod] = useState<MFAMethod>('totp');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleMethodSelect = (selectedMethod: MFAMethod) => {
    setMethod(selectedMethod);
    setStep('setup');
  };

  const handleSetupComplete = (data: TOTPSetupData) => {
    setSetupData(data as SetupData);
    setStep('verify');
  };

  const handleVerificationComplete = async (codes: string[]) => {
    setBackupCodes(codes);
    setStep('backup');
  };

  const handleBackupCodesConfirm = () => {
    setStep('complete');
  };

  const methodOptions: Array<{ type: MFAMethod; label: string; icon: React.ReactNode; description: string }> = [
    {
      type: 'totp',
      label: 'Authenticator App',
      icon: <Smartphone className="h-6 w-6" />,
      description: 'Use Google Authenticator, Authy, or Microsoft Authenticator',
    },
    {
      type: 'sms',
      label: 'Text Message',
      icon: <Mail className="h-6 w-6" />,
      description: 'Receive a code via SMS to your phone',
    },
    {
      type: 'email',
      label: 'Email',
      icon: <Mail className="h-6 w-6" />,
      description: 'Receive a code via email for verification',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Set Up Two-Factor Authentication</h2>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Step {step === 'method' ? '1' : step === 'setup' ? '2' : step === 'verify' ? '3' : '4'} of 4
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
            style={{
              width: step === 'method' ? '25%' : step === 'setup' ? '50%' : step === 'verify' ? '75%' : '100%',
            }}
          />
        </div>
      </div>

      {/* Step 1: Method Selection */}
      {step === 'method' && (
        <div className="space-y-4">
          {methodOptions.map(option => (
            <button
              key={option.type}
              onClick={() => handleMethodSelect(option.type)}
              className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/50 p-6 text-left transition hover:border-emerald-500/50 hover:bg-slate-900/50 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="text-slate-400 group-hover:text-emerald-400 transition">
                    {option.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Setup */}
      {step === 'setup' && (
        <TOTPSetup
          method={method}
          onComplete={handleSetupComplete}
          onBack={() => setStep('method')}
        />
      )}

      {/* Step 3: Verify */}
      {step === 'verify' && setupData && (
        <MFAVerification
          method={method}
          setupData={setupData}
          onComplete={handleVerificationComplete}
          onBack={() => setStep('setup')}
        />
      )}

      {/* Step 4: Backup Codes */}
      {step === 'backup' && (
        <BackupCodesDisplay
          codes={backupCodes}
          onConfirm={handleBackupCodesConfirm}
          onBack={() => setStep('verify')}
        />
      )}

      {/* Complete */}
      {step === 'complete' && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
          <div>
            <h3 className="text-xl font-bold text-white">Two-Factor Authentication Enabled</h3>
            <p className="mt-2 text-sm text-slate-300">
              Your account is now protected with an additional security layer.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard/security'}
            className="mx-auto block rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
