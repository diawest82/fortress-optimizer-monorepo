'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSettings {
  name: string;
  email: string;
  defaultProvider: string;
  defaultModel: string;
  notificationsEnabled: boolean;
  darkMode: boolean;
}

export default function SettingsPage() {
  const session = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (session.status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session.status === 'authenticated' && session.data?.user) {
      // Initialize settings from session
      setSettings({
        name: session.data.user.name || '',
        email: session.data.user.email || '',
        defaultProvider: 'openai',
        defaultModel: 'gpt-4',
        notificationsEnabled: true,
        darkMode: false,
      });
      setLoading(false);
    }
  }, [mounted, session.status, session.data, router]);

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      // Simulate saving settings
      // In production, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({
        type: 'success',
        text: 'Settings saved successfully!',
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: string | boolean) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Failed to load settings</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {/* Profile Section */}
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed here</p>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default AI Provider
                </label>
                <select
                  value={settings.defaultProvider}
                  onChange={(e) => handleChange('defaultProvider', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="aws">AWS Bedrock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default Model
                </label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => handleChange('defaultModel', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                  <option value="gemini">Gemini Pro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notifications</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="notifications" className="ml-3 block text-sm text-gray-700 dark:text-gray-300">
                  Enable email notifications for optimization results
                </label>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Appearance</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="darkMode"
                  checked={settings.darkMode}
                  onChange={(e) => handleChange('darkMode', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="darkMode" className="ml-3 block text-sm text-gray-700 dark:text-gray-300">
                  Enable dark mode
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 text-center bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 p-6 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/20">
          <h2 className="text-lg font-medium text-red-900 dark:text-red-200 mb-4">Danger Zone</h2>
          <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
