'use client';

import { useState } from 'react';
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Data sets for different time ranges
  const timeRangeData = {
    '24h': {
      totalTokens: 405000,
      tokensOptimized: 131625,
      costSaved: 263.25,
      activeUsers: 180,
      growth: '+5%',
      dailyData: [
        { day: '12am', original: 45, optimized: 29 },
        { day: '4am', original: 38, optimized: 25 },
        { day: '8am', original: 82, optimized: 53 },
        { day: '12pm', original: 95, optimized: 62 },
        { day: '4pm', original: 78, optimized: 51 },
        { day: '8pm', original: 68, optimized: 44 },
        { day: '12am', original: 45, optimized: 29 },
      ],
    },
    '7d': {
      totalTokens: 2847293,
      tokensOptimized: 926000,
      costSaved: 1852.00,
      activeUsers: 1250,
      growth: '+12%',
      dailyData: [
        { day: 'Mon', original: 450, optimized: 290 },
        { day: 'Tue', original: 520, optimized: 338 },
        { day: 'Wed', original: 480, optimized: 312 },
        { day: 'Thu', original: 610, optimized: 396 },
        { day: 'Fri', original: 580, optimized: 377 },
        { day: 'Sat', original: 390, optimized: 253 },
        { day: 'Sun', original: 450, optimized: 292 },
      ],
    },
    '30d': {
      totalTokens: 12850000,
      tokensOptimized: 4177500,
      costSaved: 8355.00,
      activeUsers: 3840,
      growth: '+18%',
      dailyData: [
        { day: 'W1', original: 3520, optimized: 2284 },
        { day: 'W2', original: 3890, optimized: 2528 },
        { day: 'W3', original: 4120, optimized: 2678 },
        { day: 'W4', original: 3980, optimized: 2587 },
        { day: 'W5', original: 4340, optimized: 2821 },
        { day: '', original: 0, optimized: 0 },
        { day: '', original: 0, optimized: 0 },
      ],
    },
    '90d': {
      totalTokens: 38550000,
      tokensOptimized: 12532500,
      costSaved: 25065.00,
      activeUsers: 8200,
      growth: '+28%',
      dailyData: [
        { day: 'Jan', original: 12500, optimized: 8125 },
        { day: 'Feb', original: 13200, optimized: 8580 },
        { day: 'Mar', original: 12850, optimized: 8353 },
        { day: 'Apr', original: 13400, optimized: 8710 },
        { day: 'May', original: 13800, optimized: 8970 },
        { day: 'Jun', original: 14200, optimized: 9230 },
        { day: 'Jul', original: 14600, optimized: 9490 },
      ],
    },
  };

  const stats = timeRangeData[timeRange as keyof typeof timeRangeData];

  const allPlatformUsage = {
    all: [
      { name: 'npm Package', tokens: 450000, percentage: 35 },
      { name: 'Copilot', tokens: 380000, percentage: 29 },
      { name: 'Slack Bot', tokens: 320000, percentage: 25 },
      { name: 'Make/Zapier', tokens: 150000, percentage: 11 },
    ],
    npm: [
      { name: 'npm Package', tokens: 450000, percentage: 100 },
    ],
    copilot: [
      { name: 'Copilot', tokens: 380000, percentage: 100 },
    ],
    slack: [
      { name: 'Slack Bot', tokens: 320000, percentage: 100 },
    ],
    make: [
      { name: 'Make/Zapier', tokens: 150000, percentage: 100 },
    ],
  };

  const platformUsage = allPlatformUsage[selectedPlatform as keyof typeof allPlatformUsage];

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

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400">Total Tokens</h3>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold">{(stats.totalTokens / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-green-400 mt-2">↑ {stats.growth} from previous period</p>
          </div>

          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400">Tokens Saved</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-400">{(stats.tokensOptimized / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-zinc-400 mt-2">18% average optimization</p>
          </div>

          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400">Cost Saved</h3>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">${stats.costSaved.toLocaleString()}</div>
            <p className="text-xs text-zinc-400 mt-2">This month so far</p>
          </div>

          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400">Active Users</h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{stats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-green-400 mt-2">↑ 8% this week</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Chart */}
          <div className="card-dark p-6">
            <h2 className="text-lg font-semibold mb-6">Daily Token Usage {timeRange === '24h' ? '(Hourly)' : timeRange === '30d' ? '(Weekly)' : timeRange === '90d' ? '(Monthly)' : '(Daily)'}</h2>
            <div className="flex items-end justify-between gap-2 h-48">
              {stats.dailyData.map((data, idx) => (
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
            <div className="space-y-4">
              {platformUsage.map((platform, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{platform.name}</span>
                    <span className="text-sm text-zinc-400">{(platform.tokens / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${platform.percentage}%` }}
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
          <div className="space-y-3">
            {[
              { user: 'dev-user-1', platform: 'npm', tokens: 1850, saved: 645, time: '2 min ago' },
              { user: 'slack-team-a', platform: 'Slack Bot', tokens: 920, saved: 288, time: '15 min ago' },
              { user: 'copilot-user', platform: 'Copilot', tokens: 2340, saved: 762, time: '1 hour ago' },
              { user: 'zapier-user', platform: 'Make', tokens: 650, saved: 195, time: '3 hours ago' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.user}</p>
                  <p className="text-xs text-zinc-400">{item.platform}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.tokens.toLocaleString()} → {Math.round(item.tokens * 0.68).toLocaleString()}</p>
                  <p className="text-xs text-green-400">Saved {item.saved.toLocaleString()} tokens</p>
                </div>
                <div className="text-xs text-zinc-400 ml-4 whitespace-nowrap">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
