'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface SecurityMetrics {
  totalLogins: number;
  failedLogins: number;
  mfaAdoptionRate: number;
  passwordChanges: number;
  suspiciousActivities: number;
  lastUpdated: string;
}

export default function SecurityMetricsDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/security/dashboard-metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-lg border border-slate-800 bg-slate-950/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-100">Failed to load metrics</p>
        </div>
      </div>
    );
  }

  const failureRate = metrics.totalLogins > 0 
    ? ((metrics.failedLogins / metrics.totalLogins) * 100).toFixed(1)
    : '0';

  const cards = [
    {
      label: 'Total Logins',
      value: metrics.totalLogins.toString(),
      icon: '🔐',
      color: 'emerald',
    },
    {
      label: 'Failed Logins',
      value: metrics.failedLogins.toString(),
      icon: '⚠️',
      color: 'red',
      subtext: `${failureRate}% failure rate`,
    },
    {
      label: 'MFA Adoption',
      value: `${metrics.mfaAdoptionRate}%`,
      icon: '📱',
      color: 'blue',
    },
    {
      label: 'Password Changes',
      value: metrics.passwordChanges.toString(),
      icon: '🔑',
      color: 'purple',
    },
    {
      label: 'Suspicious Activities',
      value: metrics.suspiciousActivities.toString(),
      icon: '🚨',
      color: 'yellow',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Security Metrics</h3>
        <p className="text-xs text-slate-500">
          Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-lg border border-${card.color}-500/30 bg-${card.color}-500/5 p-4`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
                {card.subtext && (
                  <p className="mt-1 text-xs text-slate-400">{card.subtext}</p>
                )}
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={fetchMetrics}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600 transition"
      >
        Refresh Metrics
      </button>
    </div>
  );
}
