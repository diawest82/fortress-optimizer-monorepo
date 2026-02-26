'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Settings as SettingsIcon } from 'lucide-react';

interface AdminSettings {
  id: string;
  enterpriseThreshold: number;
  autoResponseEnabled: boolean;
  defaultAutoResponse: string | null;
  notifyOnEnterprise: boolean;
  notifyEmail: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    enterpriseThreshold: 999,
    autoResponseEnabled: false,
    defaultAutoResponse: '',
    notifyOnEnterprise: true,
    notifyEmail: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
      setFormData({
        enterpriseThreshold: data.enterpriseThreshold,
        autoResponseEnabled: data.autoResponseEnabled,
        defaultAutoResponse: data.defaultAutoResponse || '',
        notifyOnEnterprise: data.notifyOnEnterprise,
        notifyEmail: data.notifyEmail || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 sticky top-16 z-40 bg-black/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-2xl font-bold">⚙️ Settings</h1>
          </div>
          <p className="text-slate-400">Configure enterprise detection, notifications, and auto-responses</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-300">Settings saved successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Enterprise Detection Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">🏢 Enterprise Detection</h2>
              <p className="text-slate-400 text-sm">Configure how Fortress identifies enterprise queries</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Enterprise Threshold (minimum company size)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  name="enterpriseThreshold"
                  value={formData.enterpriseThreshold}
                  onChange={handleInputChange}
                  min="100"
                  step="100"
                  className="flex-1 max-w-xs px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <span className="text-slate-400">employees</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Companies with more than this many employees will be flagged as enterprise</p>
            </div>
          </div>

          {/* Auto-Response Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">💬 Auto-Response Templates</h2>
              <p className="text-slate-400 text-sm">Set default responses for non-enterprise inquiries</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="autoResponseEnabled"
                  name="autoResponseEnabled"
                  checked={formData.autoResponseEnabled}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoResponseEnabled" className="text-sm font-medium text-slate-300">
                  Enable automatic responses
                </label>
              </div>

              {formData.autoResponseEnabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Default Auto-Response Template
                  </label>
                  <textarea
                    name="defaultAutoResponse"
                    value={formData.defaultAutoResponse}
                    onChange={handleInputChange}
                    placeholder="Thank you for reaching out to Fortress! We'll review your inquiry and get back to you shortly."
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-slate-500 mt-2">This template will be sent to non-enterprise inquiries</p>
                </div>
              )}
            </div>
          </div>

          {/* Notification Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">🔔 Notifications</h2>
              <p className="text-slate-400 text-sm">Configure notification preferences</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="notifyOnEnterprise"
                  name="notifyOnEnterprise"
                  checked={formData.notifyOnEnterprise}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="notifyOnEnterprise" className="text-sm font-medium text-slate-300">
                  Notify when enterprise queries arrive
                </label>
              </div>

              {formData.notifyOnEnterprise && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notification Email Address
                  </label>
                  <input
                    type="email"
                    name="notifyEmail"
                    value={formData.notifyEmail}
                    onChange={handleInputChange}
                    placeholder="admin@fortress-optimizer.com"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-slate-500 mt-2">Where to send enterprise notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-6 py-3 text-sm font-semibold text-white transition"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <Link
              href="/admin"
              className="rounded-lg border border-slate-700 hover:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
