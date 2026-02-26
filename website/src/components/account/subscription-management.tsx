'use client';

import { useState } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Calendar, AlertCircle, Check } from 'lucide-react';

interface SubscriptionManagementProps {
  currentTier: string;
  currentPrice: number;
  nextBillingDate: string;
  usagePercentage: number;
  onUpgrade?: () => void;
  onDowngrade?: () => void;
  onCancel?: () => void;
}

export default function SubscriptionManagement({
  currentTier,
  currentPrice,
  nextBillingDate,
  usagePercentage,
  onUpgrade = () => {},
  onDowngrade = () => {},
  onCancel = () => {},
}: SubscriptionManagementProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      tokens: '50K',
      features: ['50K tokens/month', 'All 5 integration channels', 'Basic metrics'],
      color: 'from-slate-500 to-slate-600',
      textColor: 'text-slate-400',
    },
    {
      id: 'starter',
      name: 'Sign Up',
      price: 9.99,
      tokens: 'Unlimited',
      features: ['Unlimited tokens', 'All 5 integration channels', 'Advanced analytics', 'API access', 'Email support'],
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400',
    },
    {
      id: 'teams',
      name: 'Teams',
      price: 99,
      tokens: 'Unlimited',
      features: ['Unlimited tokens', 'Team management', 'Advanced analytics', 'Priority support', 'Slack integration'],
      color: 'from-cyan-500 to-cyan-600',
      textColor: 'text-cyan-400',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      tokens: 'Unlimited',
      features: ['Everything in Teams', 'Custom integrations', 'Dedicated account manager', '24/7 support', 'On-premise option'],
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400',
    },
  ];

  const currentTierData = tiers.find((t) => t.id === currentTier);

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Current Plan</h3>
            <p className="text-sm text-slate-400">Active subscription</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              {currentPrice === 0 ? 'Free' : `$${currentPrice}/mo`}
            </p>
            <p className="text-sm text-slate-400 capitalize mt-1">{currentTierData?.name || currentTier}</p>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Monthly Token Usage</span>
            <span className="text-sm text-emerald-400">{usagePercentage}% used</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Billing Info */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Calendar className="w-4 h-4" />
          Next billing: <span className="text-white font-medium">{new Date(nextBillingDate).toLocaleDateString()}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {currentTier !== 'enterprise' && (
            <button
              onClick={onUpgrade}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
            >
              <ArrowUpRight className="w-4 h-4" />
              Upgrade Plan
            </button>
          )}
          {currentTier !== 'free' && (
            <button
              onClick={onDowngrade}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Downgrade
            </button>
          )}
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 text-red-400 rounded-lg font-semibold transition"
          >
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-4 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-2">Are you sure?</h4>
              <p className="text-sm text-slate-300 mb-4">
                Canceling your subscription will:
              </p>
              <ul className="space-y-1 text-sm text-slate-400 mb-6 ml-4">
                <li>• End your current plan at the end of billing period</li>
                <li>• Revert you to Free tier</li>
                <li>• Reduce your token limit to 50K/month</li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition"
                >
                  Yes, Cancel Subscription
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Billing History</h4>
          <button className="text-sm text-emerald-400 hover:text-emerald-300">View All</button>
        </div>
        <div className="space-y-3">
          {[
            { date: 'Feb 19, 2026', amount: currentPrice, status: 'Paid' },
            { date: 'Jan 19, 2026', amount: currentPrice, status: 'Paid' },
            { date: 'Dec 19, 2025', amount: currentPrice, status: 'Paid' },
          ].map((invoice, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-medium text-white">{invoice.date}</p>
                  <p className="text-xs text-slate-400">Invoice #{idx + 1}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">${invoice.amount.toFixed(2)}</p>
                <p className="text-xs text-emerald-400">{invoice.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other Plans */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Other Plans</h4>
        <div className="grid md:grid-cols-2 gap-4">
          {tiers.filter((t) => t.id !== currentTier).map((tier) => (
            <div
              key={tier.id}
              className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 hover:border-slate-600 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h5 className="font-semibold text-white">{tier.name}</h5>
                  <p className="text-xs text-slate-400 mt-1">
                    {tier.tokens} tokens/month
                  </p>
                </div>
                {tier.price !== null && (
                  <p className="text-2xl font-bold text-white">${tier.price}</p>
                )}
              </div>
              <ul className="space-y-2 mb-4">
                {tier.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2 rounded-lg font-semibold transition ${
                tier.id === 'enterprise'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : currentTier === 'free'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}>
                {tier.id === 'enterprise' ? 'Contact Sales' : 'Switch Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
