'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react';

type ToolSavings = {
  source: string;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  costSavedUSD: number;
  events: number;
};

type DashboardStats = {
  hasData: boolean;
  totalTokens: number;
  tokensOptimized: number;
  tokensSaved: number;
  costSaved: number;
  avgSavingsPercent: number;
  optimizationCount: number;
  dailyData: Array<{ day: string; original: number; optimized: number }>;
  emptyStateMessage: string | null;
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [toolSavings, setToolSavings] = useState<ToolSavings[]>([]);
  const [toolSavingsLoading, setToolSavingsLoading] = useState(false);
  const [toolSavingsError, setToolSavingsError] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch REAL dashboard data from API
  useEffect(() => {
    const fetchDashboard = async () => {
      setStatsLoading(true);
      try {
        const token = document.cookie.split('; ').find(c => c.startsWith('fortress_auth_token='))?.split('=')[1];
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/dashboard/stats?range=${timeRange}`, { headers, credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setStats({ hasData: false, totalTokens: 0, tokensOptimized: 0, tokensSaved: 0, costSaved: 0, avgSavingsPercent: 0, optimizationCount: 0, dailyData: [], emptyStateMessage: 'Sign in to see your optimization data.' });
        }
      } catch {
        setStats({ hasData: false, totalTokens: 0, tokensOptimized: 0, tokensSaved: 0, costSaved: 0, avgSavingsPercent: 0, optimizationCount: 0, dailyData: [], emptyStateMessage: 'Unable to load dashboard data.' });
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchToolSavings = async () => {
      setToolSavingsLoading(true);
      setToolSavingsError('');
      try {
        const daysMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[timeRange] ?? 7;
        const res = await fetch(`/api/analytics/metrics?days=${days}&includeToolSavings=true`);
        if (res.ok) {
          const data = await res.json();
          setToolSavings(data.toolSavingsBySource || []);
        }
      } catch {
        setToolSavingsError('Failed to load tool savings');
        setToolSavings([]);
      } finally {
        setToolSavingsLoading(false);
      }
    };

    fetchDashboard();
    fetchToolSavings();
  }, [timeRange]);

  const sortedToolSavings = [...toolSavings].sort((a, b) => b.tokensSaved - a.tokensSaved);

  // Format large numbers
  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8 mb-12">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold">📊 Watch Your Savings Grow</p>
              <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
                Real-Time Optimization Dashboard
              </h1>
              <p className="mt-4 text-base text-slate-300 max-w-2xl">
                See exactly how much you're saving across all platforms. Every optimized token is money back in your pocket.
              </p>
            </div>
          </div>
        </section>

        {/* Time Range Selector */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Platforms' },
              { id: 'npm', label: 'npm' },
              { id: 'copilot', label: 'Copilot' },
              { id: 'slack', label: 'Slack' },
              { id: 'make', label: 'Make' },
            ].map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  selectedPlatform === platform.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics — REAL DATA */}
        {statsLoading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="card-dark p-6 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-24 mb-4"></div>
                <div className="h-8 bg-zinc-800 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : stats && !stats.hasData ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-12 mb-8 text-center">
            <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No optimization data yet</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              {stats.emptyStateMessage || 'Send your first optimization to see real savings here.'}
            </p>
            <a href="/install" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition">
              Get Started — Install Fortress
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Tokens Processed</h3>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold">{formatNumber(stats?.totalTokens || 0)}</div>
              <p className="text-xs text-zinc-400 mt-2">{stats?.optimizationCount || 0} optimizations</p>
            </div>

            <div className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Tokens Saved</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400">{formatNumber(stats?.tokensSaved || 0)}</div>
              <p className="text-xs text-zinc-400 mt-2">{stats?.avgSavingsPercent || 0}% average savings</p>
            </div>

            <div className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Cost Saved</h3>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold">${(stats?.costSaved || 0).toFixed(2)}</div>
              <p className="text-xs text-zinc-400 mt-2">Based on actual token reduction</p>
            </div>

            <div className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Optimizations</h3>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold">{stats?.optimizationCount || 0}</div>
              <p className="text-xs text-zinc-400 mt-2">In selected period</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Chart */}
          <div className="card-dark p-6">
            <h2 className="text-lg font-semibold mb-6">Daily Token Usage {timeRange === '24h' ? '(Hourly)' : timeRange === '30d' ? '(Weekly)' : timeRange === '90d' ? '(Monthly)' : '(Daily)'}</h2>
            <div className="flex items-end justify-between gap-2 h-48">
              {(stats?.dailyData || []).map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  {data.day && (
                    <>
                      <div className="w-full relative h-32">
                        {data.original > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/40 to-blue-500/20 rounded-t"
                            style={{ height: `${Math.min((data.original / (timeRange === '90d' ? 15000 : timeRange === '30d' ? 4500 : timeRange === '24h' ? 95 : 650)) * 100, 100)}%` }}
                          ></div>
                        )}
                        {data.optimized > 0 && (
                          <div
                            className="absolute bottom-0 left-1 right-1 bg-gradient-to-t from-green-500/60 to-green-500/30 rounded-t"
                            style={{ height: `${Math.min((data.optimized / (timeRange === '90d' ? 10000 : timeRange === '30d' ? 3000 : timeRange === '24h' ? 62 : 400)) * 100, 100)}%` }}
                          ></div>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">{data.day}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/40 rounded"></div>
                <span className="text-zinc-400">Original</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/60 rounded"></div>
                <span className="text-zinc-400">Optimized</span>
              </div>
            </div>
          </div>

          {/* Platform Usage */}
          <div className="card-dark p-6">
            <h2 className="text-lg font-semibold mb-6">Usage by Platform</h2>
            {stats?.hasData ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Platform breakdown will appear as you use different integrations.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500">No platform data yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Install Fortress on npm, VS Code, or Slack to see per-platform stats.</p>
              </div>
            )}
          </div>

          {/* Tool Savings (Real Data) */}
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Tool Savings (Real Data)</h2>
              <span className="text-xs text-zinc-500">Last {timeRange}</span>
            </div>
            {toolSavingsLoading && (
              <div className="text-sm text-zinc-400">Loading tool savings...</div>
            )}
            {toolSavingsError && (
              <div className="text-sm text-red-400">{toolSavingsError}</div>
            )}
            {!toolSavingsLoading && !toolSavingsError && sortedToolSavings.length === 0 && (
              <div className="text-sm text-zinc-400">No tool savings recorded yet.</div>
            )}
            <div className="space-y-4">
              {sortedToolSavings.map((tool) => (
                <div key={tool.source} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{tool.source}</span>
                    <span className="text-xs text-zinc-400">{tool.events} runs</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Saved {tool.tokensSaved.toLocaleString()} tokens</span>
                    <span>${tool.costSavedUSD.toFixed(2)} saved</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full"
                      style={{
                        width: `${tool.tokensBefore > 0 ? Math.min((tool.tokensSaved / tool.tokensBefore) * 100, 100) : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-dark p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Optimizations</h2>
          {stats?.hasData ? (
            <p className="text-sm text-zinc-400">Your recent optimization activity will appear here as you use the API.</p>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">No optimizations recorded yet.</p>
              <p className="text-xs text-zinc-600 mt-2">
                Install the npm package or VS Code extension and send your first prompt to see results here.
              </p>
              <a href="/install" className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm underline">
                View Install Guides
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
