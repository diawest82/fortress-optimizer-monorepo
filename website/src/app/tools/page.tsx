'use client';

import { useState } from 'react';
import { TokenCounter } from '@/components/tools/token-counter';
import { CostCalculator } from '@/components/tools/cost-calculator';
import { CompatibilityChecker } from '@/components/tools/compatibility-checker';

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('counter');

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Free Tools</h1>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
            No signup required. See your potential savings instantly.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-12 border-b border-zinc-700 overflow-x-auto">
          {[
            { id: 'counter', label: 'Token Counter' },
            { id: 'calculator', label: 'Cost Calculator' },
            { id: 'checker', label: 'Platform Checker' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'counter' && <TokenCounter />}
          {activeTab === 'calculator' && <CostCalculator />}
          {activeTab === 'checker' && <CompatibilityChecker />}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Ready to automate optimization?</h2>
          <p className="text-zinc-400 mb-6">
            These tools show you the potential. Fortress does it automatically.
          </p>
          <a
            href="/auth/signup"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
          >
            Get Started Free (No Credit Card)
          </a>
        </div>
      </div>
    </div>
  );
}
