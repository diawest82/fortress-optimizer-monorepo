'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Zap, DollarSign, Clock, BarChart3 } from 'lucide-react';

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

type RecentOptimization = {
  id: string;
  prompt: string;
  optimized: string;
  savings: number;
  platform: string;
  time: string;
};

// ─── Demo Data by Time Range ─────────────────────────────────────

const DEMO_STATS: Record<string, DashboardStats> = {
  '24h': {
    hasData: true, totalTokens: 12400, tokensOptimized: 10540, tokensSaved: 1860, costSaved: 0.08,
    avgSavingsPercent: 15, optimizationCount: 48,
    dailyData: [
      { day: '6am', original: 42, optimized: 36 }, { day: '8am', original: 68, optimized: 57 },
      { day: '10am', original: 85, optimized: 72 }, { day: '12pm', original: 78, optimized: 66 },
      { day: '2pm', original: 92, optimized: 78 }, { day: '4pm', original: 74, optimized: 63 },
      { day: '6pm', original: 55, optimized: 47 }, { day: '8pm', original: 38, optimized: 32 },
    ],
    emptyStateMessage: null,
  },
  '7d': {
    hasData: true, totalTokens: 284500, tokensOptimized: 241800, tokensSaved: 42700, costSaved: 1.92,
    avgSavingsPercent: 15, optimizationCount: 347,
    dailyData: [
      { day: 'Mon', original: 520, optimized: 440 }, { day: 'Tue', original: 480, optimized: 400 },
      { day: 'Wed', original: 610, optimized: 510 }, { day: 'Thu', original: 550, optimized: 470 },
      { day: 'Fri', original: 490, optimized: 420 }, { day: 'Sat', original: 320, optimized: 275 },
      { day: 'Sun', original: 280, optimized: 240 },
    ],
    emptyStateMessage: null,
  },
  '30d': {
    hasData: true, totalTokens: 1_245_000, tokensOptimized: 1_058_250, tokensSaved: 186_750, costSaved: 8.40,
    avgSavingsPercent: 15, optimizationCount: 1520,
    dailyData: [
      { day: 'Wk1', original: 3200, optimized: 2720 }, { day: 'Wk2', original: 3800, optimized: 3230 },
      { day: 'Wk3', original: 4100, optimized: 3485 }, { day: 'Wk4', original: 3600, optimized: 3060 },
    ],
    emptyStateMessage: null,
  },
  '90d': {
    hasData: true, totalTokens: 3_890_000, tokensOptimized: 3_306_500, tokensSaved: 583_500, costSaved: 26.25,
    avgSavingsPercent: 15, optimizationCount: 4780,
    dailyData: [
      { day: 'Jan', original: 12000, optimized: 10200 }, { day: 'Feb', original: 14500, optimized: 12325 },
      { day: 'Mar', original: 13800, optimized: 11730 },
    ],
    emptyStateMessage: null,
  },
};

const DEMO_TOOLS_ALL: ToolSavings[] = [
  { source: 'npm SDK', tokensBefore: 125000, tokensAfter: 106250, tokensSaved: 18750, costSavedUSD: 0.84, events: 142 },
  { source: 'VS Code', tokensBefore: 89000, tokensAfter: 76530, tokensSaved: 12470, costSavedUSD: 0.56, events: 98 },
  { source: 'Copilot', tokensBefore: 45000, tokensAfter: 39150, tokensSaved: 5850, costSavedUSD: 0.26, events: 64 },
  { source: 'Slack Bot', tokensBefore: 25500, tokensAfter: 21930, tokensSaved: 3570, costSavedUSD: 0.16, events: 43 },
  { source: 'Make.com', tokensBefore: 18000, tokensAfter: 15660, tokensSaved: 2340, costSavedUSD: 0.11, events: 28 },
];

const DEMO_PLATFORM_DATA: Record<string, { tokens: number; pct: number; color: string }[]> = {
  all: [
    { tokens: 125000, pct: 41, color: 'bg-blue-500' },
    { tokens: 89000, pct: 29, color: 'bg-purple-500' },
    { tokens: 45000, pct: 15, color: 'bg-green-500' },
    { tokens: 25500, pct: 9, color: 'bg-yellow-500' },
    { tokens: 18000, pct: 6, color: 'bg-pink-500' },
  ],
  npm: [{ tokens: 125000, pct: 100, color: 'bg-blue-500' }],
  copilot: [{ tokens: 45000, pct: 100, color: 'bg-green-500' }],
  slack: [{ tokens: 25500, pct: 100, color: 'bg-yellow-500' }],
  make: [{ tokens: 18000, pct: 100, color: 'bg-pink-500' }],
};
const PLATFORM_NAMES: Record<string, string> = { npm: 'npm SDK', copilot: 'Copilot', slack: 'Slack Bot', make: 'Make.com', all: 'All' };

const DEMO_RECENT: RecentOptimization[] = [
  { id: '1', prompt: 'Can you please basically help me write a comprehensive analysis...', optimized: 'Write a comprehensive analysis...', savings: 42, platform: 'npm SDK', time: '2 min ago' },
  { id: '2', prompt: 'I was wondering if you could essentially refactor this code...', optimized: 'Refactor this code...', savings: 58, platform: 'VS Code', time: '8 min ago' },
  { id: '3', prompt: 'Could you help me please summarize the meeting notes from...', optimized: 'Summarize the meeting notes from...', savings: 35, platform: 'Slack Bot', time: '15 min ago' },
  { id: '4', prompt: 'I need you to basically review this pull request and check...', optimized: 'Review this pull request and check...', savings: 29, platform: 'Copilot', time: '23 min ago' },
  { id: '5', prompt: 'Please help me essentially design a database schema for...', optimized: 'Design a database schema for...', savings: 47, platform: 'npm SDK', time: '31 min ago' },
  { id: '6', prompt: 'I would like you to write unit tests for this module...', optimized: 'Write unit tests for this module...', savings: 33, platform: 'Make.com', time: '45 min ago' },
];

// ─── Component ───────────────────────────────────────────────────

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [toolSavings, setToolSavings] = useState<ToolSavings[]>([]);
  const [toolSavingsLoading, setToolSavingsLoading] = useState(false);
  const [toolSavingsError, setToolSavingsError] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/dashboard/stats?range=${timeRange}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setIsDemo(false);
        } else {
          setIsDemo(true);
          setStats(DEMO_STATS[timeRange] || DEMO_STATS['7d']);
        }
      } catch {
        setIsDemo(true);
        setStats(DEMO_STATS[timeRange] || DEMO_STATS['7d']);
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
        } else {
          setToolSavings(selectedPlatform === 'all'
            ? DEMO_TOOLS_ALL
            : DEMO_TOOLS_ALL.filter(t => t.source.toLowerCase().includes(selectedPlatform)));
        }
      } catch {
        setToolSavings(selectedPlatform === 'all'
          ? DEMO_TOOLS_ALL
          : DEMO_TOOLS_ALL.filter(t => t.source.toLowerCase().includes(selectedPlatform)));
      } finally {
        setToolSavingsLoading(false);
      }
    };

    fetchDashboard();
    fetchToolSavings();
  }, [timeRange, selectedPlatform]);

  // Filter tool savings by platform in demo mode
  const filteredToolSavings = isDemo && selectedPlatform !== 'all'
    ? toolSavings.filter(t => t.source.toLowerCase().includes(selectedPlatform))
    : toolSavings;
  const sortedToolSavings = [...filteredToolSavings].sort((a, b) => b.tokensSaved - a.tokensSaved);

  // Filter recent optimizations by platform
  const filteredRecent = selectedPlatform === 'all'
    ? DEMO_RECENT
    : DEMO_RECENT.filter(r => r.platform.toLowerCase().includes(selectedPlatform));

  const platformData = DEMO_PLATFORM_DATA[selectedPlatform] || DEMO_PLATFORM_DATA['all'];

  const chartMax = timeRange === '90d' ? 15000 : timeRange === '30d' ? 4500 : timeRange === '24h' ? 95 : 650;
  const chartMaxOpt = timeRange === '90d' ? 13000 : timeRange === '30d' ? 3800 : timeRange === '24h' ? 80 : 520;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        {/* Hero */}
        <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold">📊 Watch Your Savings Grow</p>
          <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">Real-Time Optimization Dashboard</h1>
          <p className="mt-4 text-base text-slate-300 max-w-2xl">See exactly how much you're saving across all platforms. Every optimized token is money back in your pocket.</p>
        </section>

        {/* Demo Banner */}
        {isDemo && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 px-6 py-4 mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-300">Sample Dashboard</p>
              <p className="text-xs text-yellow-200/70">Interactive demo — click any button to explore. Sign in to see real data.</p>
            </div>
            <a href="/auth/signup" className="rounded-lg bg-yellow-600 hover:bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition flex-shrink-0">
              Get Started Free
            </a>
          </div>
        )}

        {/* Time Range + Platform Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button key={range} onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition ${timeRange === range ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
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
              <button key={platform.id} onClick={() => setSelectedPlatform(platform.id)}
                className={`px-4 py-2 rounded-lg transition text-sm ${selectedPlatform === platform.id ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
                {platform.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        {statsLoading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-24 mb-4" /><div className="h-8 bg-zinc-800 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Tokens Processed</h3>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold">{formatNumber(stats?.totalTokens || 0)}</div>
              <p className="text-xs text-zinc-400 mt-2">{stats?.optimizationCount || 0} optimizations</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Tokens Saved</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400">{formatNumber(stats?.tokensSaved || 0)}</div>
              <p className="text-xs text-zinc-400 mt-2">{stats?.avgSavingsPercent || 0}% average savings</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Cost Saved</h3>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold">${(stats?.costSaved || 0).toFixed(2)}</div>
              <p className="text-xs text-zinc-400 mt-2">Based on actual token reduction</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-400">Optimizations</h3>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold">{stats?.optimizationCount || 0}</div>
              <p className="text-xs text-zinc-400 mt-2">In selected period</p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Chart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold mb-6">
              Token Usage {timeRange === '24h' ? '(Hourly)' : timeRange === '30d' ? '(Weekly)' : timeRange === '90d' ? '(Monthly)' : '(Daily)'}
            </h2>
            <div className="flex items-end justify-between gap-2 h-48">
              {(stats?.dailyData || []).map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative h-36">
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/40 to-blue-500/20 rounded-t transition-all duration-500"
                      style={{ height: `${Math.min((data.original / chartMax) * 100, 100)}%` }} />
                    <div className="absolute bottom-0 left-1 right-1 bg-gradient-to-t from-green-500/60 to-green-500/30 rounded-t transition-all duration-500"
                      style={{ height: `${Math.min((data.optimized / chartMaxOpt) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400">{data.day}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500/40 rounded" /><span className="text-zinc-400">Original</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500/60 rounded" /><span className="text-zinc-400">Optimized</span></div>
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold mb-6">
              {selectedPlatform === 'all' ? 'Usage by Platform' : `${PLATFORM_NAMES[selectedPlatform] || selectedPlatform} Usage`}
            </h2>
            <div className="space-y-3">
              {(selectedPlatform === 'all'
                ? [
                    { name: 'npm SDK', tokens: 125000, pct: 41, color: 'bg-blue-500' },
                    { name: 'VS Code', tokens: 89000, pct: 29, color: 'bg-purple-500' },
                    { name: 'Copilot', tokens: 45000, pct: 15, color: 'bg-green-500' },
                    { name: 'Slack Bot', tokens: 25500, pct: 9, color: 'bg-yellow-500' },
                    { name: 'Make.com', tokens: 18000, pct: 6, color: 'bg-pink-500' },
                  ]
                : platformData
              ).map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${p.color} flex-shrink-0`} />
                  <span className="text-sm text-slate-300 flex-1">{selectedPlatform === 'all' ? ['npm SDK', 'VS Code', 'Copilot', 'Slack Bot', 'Make.com'][i] : PLATFORM_NAMES[selectedPlatform]}</span>
                  <span className="text-xs text-slate-500">{formatNumber(p.tokens)} tokens</span>
                  <span className="text-xs text-slate-400 w-10 text-right">{p.pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <div className="flex h-3 rounded-full overflow-hidden">
                {platformData.map((p, i) => (
                  <div key={i} className={`${p.color} transition-all duration-500`} style={{ width: `${p.pct}%` }} />
                ))}
              </div>
            </div>
            {selectedPlatform !== 'all' && (
              <p className="text-xs text-zinc-500 mt-4">Showing {PLATFORM_NAMES[selectedPlatform]} only. Click "All Platforms" to see the full breakdown.</p>
            )}
          </div>
        </div>

        {/* Tool Savings + Recent Activity Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Tool Savings */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Tool Savings</h2>
              <span className="text-xs text-zinc-500">Last {timeRange}</span>
            </div>
            {toolSavingsLoading ? (
              <div className="text-sm text-zinc-400">Loading...</div>
            ) : (
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
                      <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${tool.tokensBefore > 0 ? Math.min((tool.tokensSaved / tool.tokensBefore) * 100, 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Optimizations */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Recent Optimizations</h2>
              <Clock className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="space-y-3">
              {(isDemo ? filteredRecent : []).map((opt) => (
                <div key={opt.id} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-400">{opt.platform}</span>
                    <span className="text-xs text-zinc-500">{opt.time}</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-through mb-1">{opt.prompt}</p>
                  <p className="text-sm text-green-400">{opt.optimized}</p>
                  <p className="text-xs text-emerald-500 mt-1">{opt.savings}% tokens saved</p>
                </div>
              ))}
              {!isDemo && (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-500">Your recent activity will appear here.</p>
                  <a href="/install" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">Install Fortress →</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
