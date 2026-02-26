'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminInitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'diall@fortress-optimizer.com',
          name: 'Admin',
          password: 'PuraVida20'
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Admin created! Redirecting to login...');
        setTimeout(() => router.push('/admin/login'), 2000);
      } else {
        setMessage(`❌ ${data.error || 'Failed to create admin'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">Admin Setup</h1>
        <p className="text-slate-300 mb-6">
          Click below to initialize your admin account with:
        </p>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6 text-sm text-slate-300">
          <p>Email: <code className="text-green-400">diall@fortress-optimizer.com</code></p>
          <p>Password: <code className="text-green-400">PuraVida20</code></p>
        </div>

        <button
          onClick={handleInit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Initializing...' : 'Create Admin Account'}
        </button>

        {message && (
          <div className={`mt-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
