'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Package, AlertTriangle, Users } from 'lucide-react';

interface KPIData {
  visitorAcquisitions: number;
  serviceInterruptions: number;
  packagesInstalled: number;
  tokensSaved: number;
}

export default function AdminDashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    visitorAcquisitions: 0,
    serviceInterruptions: 0,
    packagesInstalled: 0,
    tokensSaved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const response = await fetch('/api/admin/kpis');
        if (!response.ok) throw new Error('Failed to fetch KPIs');
        const data = await response.json();
        setKpiData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchKPIs, 30000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    {
      label: 'Visitor Acquisitions',
      value: kpiData.visitorAcquisitions,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      label: 'Packages Installed',
      value: kpiData.packagesInstalled,
      icon: Package,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    },
    {
      label: 'Tokens Saved',
      value: Math.floor(kpiData.tokensSaved / 1000) + 'K',
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      label: 'Service Interruptions',
      value: kpiData.serviceInterruptions,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 sticky top-0 z-40 bg-black/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📊 Admin Dashboard</h1>
              <p className="text-slate-400">Real-time metrics and key performance indicators</p>
            </div>
            <Link
              href="/admin/emails"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition"
            >
              📧 View Emails
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const IconComponent = kpi.icon;
            return (
              <div
                key={index}
                className={`rounded-2xl border ${kpi.borderColor} ${kpi.bgColor} p-6 transition-all hover:border-opacity-50`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">{kpi.label}</p>
                    <p className={`text-4xl font-bold bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
                      {loading ? '—' : kpi.value}
                    </p>
                  </div>
                  <div className={`rounded-lg ${kpi.bgColor} p-3`}>
                    <IconComponent className="w-6 h-6 text-slate-300" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="h-1 flex-1 bg-gradient-to-r from-slate-700 to-transparent rounded-full"></div>
                  <span>Live</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats Section */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
          <h2 className="text-xl font-bold text-white mb-6">📈 Quick Stats</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <p className="font-medium text-slate-300">Performance</p>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <p>• System uptime: 99.9%</p>
                <p>• Avg response time: 68ms</p>
                <p>• Active sessions: {loading ? '—' : kpiData.visitorAcquisitions}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <p className="font-medium text-slate-300">Engagement</p>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <p>• Total packages: {loading ? '—' : kpiData.packagesInstalled}</p>
                <p>• Avg tokens per request: ~250</p>
                <p>• Savings rate: 20%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Features Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Email Management */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 hover:border-slate-700 transition">
            <p className="text-2xl mb-2">📧</p>
            <h3 className="text-lg font-bold text-white mb-2">Email Management</h3>
            <p className="text-sm text-slate-400 mb-4">View and reply to customer emails with AI assistance</p>
            <Link
              href="/admin/emails"
              className="inline-block text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Manage Emails →
            </Link>
          </div>

          {/* User Management */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 hover:border-slate-700 transition">
            <p className="text-2xl mb-2">👥</p>
            <h3 className="text-lg font-bold text-white mb-2">User Management</h3>
            <p className="text-sm text-slate-400 mb-4">Create and manage admin accounts with different roles</p>
            <Link
              href="/admin/users"
              className="inline-block text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Manage Users →
            </Link>
          </div>

          {/* Settings */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 hover:border-slate-700 transition">
            <p className="text-2xl mb-2">⚙️</p>
            <h3 className="text-lg font-bold text-white mb-2">Settings</h3>
            <p className="text-sm text-slate-400 mb-4">Configure enterprise threshold and auto-responses</p>
            <Link
              href="/admin/settings"
              className="inline-block text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Configure Settings →
            </Link>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 hover:border-slate-700 transition">
            <p className="text-2xl mb-2">🔔</p>
            <h3 className="text-lg font-bold text-white mb-2">Notifications</h3>
            <p className="text-sm text-slate-400 mb-4">Set up alerts and response templates</p>
            <Link
              href="/admin/notifications"
              className="inline-block text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Configure Notifications →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
