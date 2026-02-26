'use client';

import { useState } from 'react';

interface ProviderCost {
  name: string;
  costPer1k: number;
}

const providers: Record<string, ProviderCost> = {
  gpt4: { name: 'GPT-4', costPer1k: 0.000045 },
  claude: { name: 'Claude 3', costPer1k: 0.000009 },
  gemini: { name: 'Gemini', costPer1k: 0.000075 }
};

const fortressPlans = {
  free: 0,       // 50K tokens/month
  starter: 9.99, // 500K tokens/month - individual developers
  teams: 99,     // Unlimited - teams and organizations
  enterprise: null // Custom pricing - large organizations
};

export function CostCalculator() {
  const [inputs, setInputs] = useState({
    tokensPerDay: 10000,
    provider: 'gpt4',
    plan: 'starter'
  });

  const monthlyTokens = inputs.tokensPerDay * 30;
  const providerData = providers[inputs.provider as keyof typeof providers];
  const currentCost = monthlyTokens * providerData.costPer1k;
  const optimizedCost = currentCost * 0.82;
  const savingsAmount = currentCost - optimizedCost;

  // Determine Fortress plan cost and token limits
  const planConfig: Record<string, { cost: number | null; tokens: number | null; label: string }> = {
    free: { cost: 0, tokens: 50000, label: 'Free - 50K tokens/month' },
    starter: { cost: 9.99, tokens: null, label: 'Sign Up - $9.99/month (Unlimited)' },
    teams: { cost: 99, tokens: null, label: 'Teams - $99/month (Unlimited)' },
    enterprise: { cost: null, tokens: null, label: 'Enterprise (Custom pricing)' }
  };

  const currentPlan = planConfig[inputs.plan];
  const fortressCost = currentPlan.cost ?? 0;
  const isEnterprise = inputs.plan === 'enterprise';
  const netSavings = isEnterprise ? savingsAmount : savingsAmount - fortressCost;

  return (
    <div>
      <div className="space-y-6">
        {/* Tokens Per Day */}
        <div>
          <label className="block text-sm font-semibold mb-2">Tokens Per Day</label>
          <input
            type="number"
            min="100"
            max="1000000"
            value={inputs.tokensPerDay}
            onChange={(e) => setInputs({ ...inputs, tokensPerDay: parseInt(e.target.value) })}
            className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2 border border-zinc-700 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="range"
            min="100"
            max="1000000"
            value={inputs.tokensPerDay}
            onChange={(e) => setInputs({ ...inputs, tokensPerDay: parseInt(e.target.value) })}
            className="w-full mt-3 cursor-pointer"
          />
          <div className="text-xs text-zinc-400 mt-2">{inputs.tokensPerDay.toLocaleString()} tokens/day</div>
        </div>

        {/* LLM Provider */}
        <div>
          <label className="block text-sm font-semibold mb-2">LLM Provider</label>
          <select
            value={inputs.provider}
            onChange={(e) => setInputs({ ...inputs, provider: e.target.value })}
            className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2 border border-zinc-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="gpt4">GPT-4 (Most expensive)</option>
            <option value="claude">Claude 3 (Mid-range)</option>
            <option value="gemini">Gemini (Cheapest)</option>
          </select>
        </div>

        {/* Plan Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2">Fortress Plan</label>
          <select
            value={inputs.plan}
            onChange={(e) => setInputs({ ...inputs, plan: e.target.value })}
            className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2 border border-zinc-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="free">Free - 50K tokens/month</option>
            <option value="starter">Sign Up - $9.99/month (Unlimited)</option>
            <option value="teams">Teams - $99/month (Unlimited)</option>
            <option value="enterprise">Enterprise (Custom pricing)</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 space-y-6">
        {/* Cost Breakdown */}
        <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-lg p-8 border border-zinc-700">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Current Monthly Cost</div>
              <div className="text-4xl font-bold">${currentCost.toFixed(2)}</div>
              <div className="text-xs text-zinc-500 mt-1">{providerData.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-400 mb-1">With Fortress</div>
              <div className="text-4xl font-bold text-green-400">${optimizedCost.toFixed(2)}</div>
              <div className="text-xs text-green-500 mt-1">18% reduction</div>
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">API Cost (Original)</span>
                <span className="font-mono font-semibold">${currentCost.toFixed(2)}/month</span>
              </div>
              <div className="flex justify-between text-sm bg-green-900 bg-opacity-20 -mx-4 px-4 py-2 rounded border border-green-900">
                <span className="text-green-300">API Cost (Optimized)</span>
                <span className="font-mono font-semibold text-green-300">${optimizedCost.toFixed(2)}/month</span>
              </div>

              {!isEnterprise && (
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-zinc-400">Fortress Cost</span>
                  <span className="font-mono font-semibold">${fortressCost.toFixed(2)}/month</span>
                </div>
              )}

              {isEnterprise && (
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-zinc-400">Fortress Cost</span>
                  <span className="font-mono font-semibold text-blue-300">Custom pricing</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-4 border-t border-zinc-700">
                <span className="text-green-300">Net Monthly Savings</span>
                <span className={`font-mono ${netSavings > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  ${netSavings.toFixed(2)}/month
                </span>
              </div>

              <div className="text-xs text-zinc-400 pt-2">
                Annual savings: ${(netSavings * 12).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* ROI Box */}
        {!isEnterprise && netSavings > 0 && (
          <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-6">
            <h3 className="font-semibold text-green-300 mb-2">💰 Positive ROI</h3>
            <p className="text-sm text-zinc-300 mb-4">
              Fortress pays for itself and saves you <strong>${(netSavings * 12).toFixed(0)}/year</strong>.
            </p>
            <a
              href="/auth/signup"
              className="inline-block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition"
            >
              Get Started Free
            </a>
          </div>
        )}

        {isEnterprise && (
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-6">
            <h3 className="font-semibold text-blue-300 mb-2">🚀 Enterprise Solution</h3>
            <p className="text-sm text-zinc-300 mb-4">
              With {(inputs.tokensPerDay * 30 / 1000000).toFixed(1)}M+ monthly tokens, you could save <strong>${(savingsAmount * 12).toFixed(0)}/year</strong> with optimization.
            </p>
            <a
              href="mailto:sales@fortress-optimizer.com?subject=Enterprise Pricing Inquiry"
              className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
            >
              Contact Sales
            </a>
          </div>
        )}

        {!isEnterprise && netSavings < 0 && (
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Want unlimited optimization?</h3>
            <p className="text-sm text-zinc-300 mb-4">
              Upgrade to a higher plan for unlimited tokens and advanced features.
            </p>
            <a
              href="/auth/signup"
              className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
            >
              Try Free for 14 Days
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
