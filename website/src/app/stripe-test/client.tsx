'use client';

import { useState } from 'react';

export default function StripeTestPage() {
  // Test checkout page for Stripe payment integration
  const [tier, setTier] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Use the test user ID
      const userId = 'cmlrjndn90000pqact2qj5uwd';

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/stripe-test?success=true`,
          cancelUrl: `${window.location.origin}/stripe-test?canceled=true`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(`Error: ${data.error}`);
        setLoading(false);
        return;
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError('No checkout URL returned');
        setLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create checkout: ${message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Stripe Test</h1>
          <p className="text-slate-600 mb-6">
            User ID: <code className="bg-slate-100 px-2 py-1 rounded">cmlrjndn90000pqact2qj5uwd</code>
          </p>

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="individual">Individual ($9.99/month)</option>
              <option value="teams">Teams ($99/month)</option>
              <option value="enterprise">Enterprise (Custom)</option>
            </select>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {loading ? 'Creating Checkout...' : 'Proceed to Checkout'}
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Test Payment Card:</h3>
            <code className="text-sm text-blue-800 block">Card: 4242 4242 4242 4242</code>
            <code className="text-sm text-blue-800 block">Exp: Any future date (e.g., 12/25)</code>
            <code className="text-sm text-blue-800 block">CVC: Any 3 digits (e.g., 123)</code>
          </div>
        </div>
      </div>
    </div>
  );
}
