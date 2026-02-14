'use client';

import { useState } from 'react';
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');

  const stats = {
    totalTokens: 2847293,
    tokensOptimized: 926000,
    costSaved: 1852.00,
    activeUsers: 1250,
  };

  const dailyData = [
    { day: 'Mon', original: 450, optimized: 290 },
    { day: 'Tue', original: 520, optimized: 338 },
    { day: 'Wed', original: 480, optimized: 312 },
    { day: 'Thu', original: 610, optimized: 396 },
    { day: 'Fri', original: 580, optimized: 377 },
    { day: 'Sat', original: 390, optimized: 253 },
    { day: 'Sun', original: 450, optimized: 292 },
  ];

  const platformUsage = [
    { name: 'npm Package', tokens: 450000, percentage: 35 },
    { name: 'Copilot', tokens: 380000, percentage: 29 },
    { name: 'Slack Bot', tokens: 320000, percentage: 25 },
    { name: 'Make/Zapier', tokens: 150000, percentage: 11 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-zinc-400">Real-time optimization metrics across all platforms</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-8">
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

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400">Total Tokens</h3>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold">{(stats.totalTokens / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-green-400 mt-2">↑ 12% from last week</p>
          </div>

          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400">Tokens Saved</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-400">{(stats.tokensOptimized / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-zinc-400 mt-2">32.5% average optimization</p>
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
            <h2 className="text-lg font-semibold mb-6">Daily Token Usage (K)</h2>
            <div className="flex items-end justify-between gap-2 h-48">
              {dailyData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative h-32">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/40 to-blue-500/20 rounded-t"
                      style={{ height: `${(data.original / 650) * 100}%` }}
                    ></div>
                    <div
                      className="absolute bottom-0 left-1 right-1 bg-gradient-to-t from-green-500/60 to-green-500/30 rounded-t"
                      style={{ height: `${(data.optimized / 650) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-zinc-400">{data.day}</span>
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
