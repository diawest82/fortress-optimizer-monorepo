'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Bell } from 'lucide-react';

interface NotificationSettings {
  id: string;
  notifyOnEnterprise: boolean;
  notifyEmail: string | null;
  autoResponseEnabled: boolean;
  defaultAutoResponse: string | null;
}

export default function NotificationsClient() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    notifyOnEnterprise: true,
    notifyEmail: '',
  });

  const [templates, setTemplates] = useState({
    autoResponseEnabled: false,
    defaultAutoResponse: '',
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
        notifyOnEnterprise: data.notifyOnEnterprise,
        notifyEmail: data.notifyEmail || '',
      });
      setTemplates({
        autoResponseEnabled: data.autoResponseEnabled,
        defaultAutoResponse: data.defaultAutoResponse || '',
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

  const handleTemplateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setTemplates(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
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

      if (!response.ok) throw new Error('Failed to save notifications');
      
      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates),
      });

      if (!response.ok) throw new Error('Failed to save templates');
      
      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save templates');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-white">Loading preferences...</p>
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
            <Bell className="w-6 h-6" />
            <h1 className="text-2xl font-bold">🔔 Notification Preferences</h1>
          </div>
          <p className="text-slate-400">Configure alerts and auto-response templates</p>
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
            <p className="text-emerald-300">Preferences saved successfully!</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Notification Alerts Section */}
          <form onSubmit={handleSaveNotifications} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">🚨 Notification Alerts</h2>
              <p className="text-slate-400 text-sm">Receive alerts for important events</p>
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
                  📧 Notify me when enterprise queries arrive
                </label>
              </div>

              {formData.notifyOnEnterprise && (
                <div className="ml-8">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notification Email Address
                  </label>
                  <input
                    type="email"
                    name="notifyEmail"
                    value={formData.notifyEmail}
                    onChange={handleInputChange}
                    placeholder="admin@fortress-optimizer.com"
                    className="w-full max-w-sm px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-slate-500 mt-2">Alerts will be sent to this email address</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-6 py-2 text-sm font-semibold text-white transition"
              >
                {saving ? 'Saving...' : 'Save Notifications'}
              </button>
            </div>
          </form>

          {/* Auto-Response Templates Section */}
          <form onSubmit={handleSaveTemplates} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">💬 Auto-Response Templates</h2>
              <p className="text-slate-400 text-sm">Set up automatic replies for different types of inquiries</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="autoResponseEnabled"
                  name="autoResponseEnabled"
                  checked={templates.autoResponseEnabled}
                  onChange={handleTemplateChange}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoResponseEnabled" className="text-sm font-medium text-slate-300">
                  ✅ Enable automatic responses
                </label>
              </div>

              {templates.autoResponseEnabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Default Auto-Response Template
                  </label>
                  <textarea
                    name="defaultAutoResponse"
                    value={templates.defaultAutoResponse}
                    onChange={handleTemplateChange}
                    placeholder="Thank you for reaching out to Fortress! We appreciate your interest and will review your inquiry shortly. Our team will get back to you within 24 hours."
                    rows={5}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-slate-500 mt-2">This template will be sent to standard inquiries (non-enterprise, non-sales)</p>

                  {/* Template Preview */}
                  <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Preview:</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {templates.defaultAutoResponse || 'Your template will appear here...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-6 py-2 text-sm font-semibold text-white transition"
              >
                {saving ? 'Saving...' : 'Save Templates'}
              </button>
            </div>
          </form>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
              <p className="text-sm font-semibold text-slate-300 mb-2">💡 Tip</p>
              <p className="text-sm text-slate-400">
                Enterprise queries always route to your sales team manually - auto-responses are only sent to general inquiries.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
              <p className="text-sm font-semibold text-slate-300 mb-2">📊 Status</p>
              <p className="text-sm text-slate-400">
                Auto-responses {templates.autoResponseEnabled ? 'enabled' : 'disabled'}. Enterprise alerts {formData.notifyOnEnterprise ? 'enabled' : 'disabled'}.
              </p>
            </div>
          </div>

          {/* Back Button */}
          <Link
            href="/admin"
            className="inline-block rounded-lg border border-slate-700 hover:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
