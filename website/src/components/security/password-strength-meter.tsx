'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface PasswordValidation {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export default function PasswordStrengthMeter() {
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<PasswordValidation | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = useCallback(async (pwd: string) => {
    if (!pwd) {
      setValidation(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });

      if (!response.ok) throw new Error('Validation failed');
      const data = await response.json();
      setValidation(data);
    } catch (error) {
      console.error('Password validation error:', error);
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce password validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validatePassword(password);
    }, 300);

    return () => clearTimeout(timer);
  }, [password, validatePassword]);

  const getStrengthColor = (score: number) => {
    if (score < 30) return 'from-red-500 to-red-600';
    if (score < 60) return 'from-yellow-500 to-yellow-600';
    if (score < 80) return 'from-blue-500 to-blue-600';
    return 'from-emerald-500 to-emerald-600';
  };

  const getStrengthLabel = (score: number) => {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 80) return 'Good';
    return 'Strong';
  };

  const requirements = [
    { label: '8+ characters', regex: /.{8,}/ },
    { label: 'Uppercase letter', regex: /[A-Z]/ },
    { label: 'Lowercase letter', regex: /[a-z]/ },
    { label: 'Number', regex: /[0-9]/ },
    { label: 'Special character', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
  ];

  const met = requirements.filter(req => req.regex.test(password)).length;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-slate-100">New Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter a strong password"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>

      {password && validation && (
        <>
          {/* Strength Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Password Strength
              </span>
              <span className={`text-sm font-bold ${
                validation.score < 30 ? 'text-red-400' :
                validation.score < 60 ? 'text-yellow-400' :
                validation.score < 80 ? 'text-blue-400' :
                'text-emerald-400'
              }`}>
                {getStrengthLabel(validation.score)} ({validation.score}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getStrengthColor(validation.score)} transition-all duration-300`}
                style={{ width: `${validation.score}%` }}
              />
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-100">
              Requirements ({met}/{requirements.length})
            </p>
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {req.regex.test(password) ? (
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-slate-600 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      req.regex.test(password) ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {validation.feedback.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-100">Suggestions:</p>
                  <ul className="mt-2 space-y-1">
                    {validation.feedback.map((fb, idx) => (
                      <li key={idx} className="text-xs text-yellow-200">
                        • {fb}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
