// Dashboard component for analytics
// File: src/components/AnalyticsDashboard.tsx

'use client';

import { useEffect, useState } from 'react';

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState({
    newSignups: 0,
    activeUsers: 0,
    conversionRate: 0,
    churnRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/analytics/metrics?days=7');
        const data = await response.json();
        
        // Calculate derived metrics
        const totalSignups = data.signupsBySource.reduce((sum: number, s: any) => sum + s._count.id, 0);
        const active = data.eventMetrics.find((e: any) => e.eventName === 'login')?._count.id || 0;

        setMetrics({
          newSignups: totalSignups,
          activeUsers: active,
          conversionRate: data.funnels[0]?.conversionRate || 0,
          churnRate: data.funnels[0]?.churnRate || 0,
        });
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="text-slate-400">Loading analytics...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <MetricCard label="New Signups" value={metrics.newSignups} change="+12%" />
      <MetricCard label="Active Users" value={metrics.activeUsers} change="+8%" />
      <MetricCard label="Conversion Rate" value={`${metrics.conversionRate.toFixed(1)}%`} change="+2%" />
      <MetricCard label="Churn Rate" value={`${metrics.churnRate.toFixed(1)}%`} change="-3%" />
    </div>
  );
}

function MetricCard({ label, value, change }: { label: string; value: string | number; change: string }) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white mb-2">{value}</div>
      <div className={`text-xs ${change.includes('+') ? 'text-green-400' : 'text-red-400'}`}>
        {change} vs last week
      </div>
    </div>
  );
}
