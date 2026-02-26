/**
 * Stripe Checkout Component
 * Displays pricing tiers and initiates Stripe checkout
 */

'use client';

import { useState } from 'react';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  checkoutDescription: string;
}

const PRICING_TIERS: Record<string, PricingTier> = {
  individual: {
    id: 'individual',
    name: 'Individual',
    price: 9.99,
    interval: 'month',
    checkoutDescription: 'Perfect for developers and small projects. Optimize tokens across all platforms with full analytics and API access.',
    features: [
      '500K tokens/month',
      'All 5 integration channels',
      'Real-time optimization',
      'Advanced analytics dashboard',
      'Email support',
      'API access',
    ],
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    price: 99,
    interval: 'month',
    checkoutDescription: 'The smart choice for growing teams. Unlimited optimization, team collaboration, and priority support. Save thousands on token costs.',
    features: [
      'Unlimited tokens',
      'Team seat management',
      'Advanced analytics',
      'Priority email support',
      'Slack integration',
      'Saves $30-150+/month per team',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    interval: 'month',
    checkoutDescription: 'Enterprise-grade solution with unlimited tokens, custom integrations, and dedicated support. Built for large organizations.',
    features: [
      'Unlimited everything',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 priority support',
      'SLA guarantee',
      'On-premise deployment',
    ],
  },
};

interface StripeCheckoutProps {
  userId?: string;
  currentTier?: string;
  onCheckoutStart?: () => void;
  onCheckoutError?: (error: string) => void;
}

export default function StripeCheckout({
  userId,
  currentTier = 'free',
  onCheckoutStart,
  onCheckoutError,
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (tier: string) => {
    if (!userId) {
      setError('Please sign in to upgrade');
      onCheckoutError?.('User not authenticated');
      return;
    }

    setLoading(tier);
    setError(null);
    onCheckoutStart?.();

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL provided');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
      onCheckoutError?.(message);
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600">Choose the plan that&apos;s right for you</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(PRICING_TIERS).map(([key, tier]) => (
            <div
              key={key}
              className={`rounded-lg border-2 overflow-hidden transition-all ${
                currentTier === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="p-6">
                {currentTier === key && (
                  <div className="mb-4">
                    <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-gray-600 ml-2">/{tier.interval}</span>
                </div>

                <button
                  onClick={() => handleCheckout(key)}
                  disabled={loading === key || currentTier === key}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-6 ${
                    loading === key
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : currentTier === key
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {loading === key ? 'Loading...' : currentTier === key ? 'Current Plan' : 'Upgrade Now'}
                </button>

                <ul className="space-y-4">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>Need a custom plan? <a href="mailto:sales@example.com" className="text-blue-500 hover:underline">Contact sales</a></p>
        </div>
      </div>
    </div>
  );
}
