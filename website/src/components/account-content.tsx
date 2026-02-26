"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import TeamManagement from "./account/team-management";
import SupportSystem from "./account/support-system";
import SubscriptionManagement from "./account/subscription-management";
import CommunityPortal from "./account/community-portal";
import EnterpriseFeatures from "./account/enterprise-features";

interface ApiKey {
  key_id?: string;
  id?: string;
  name: string;
  key?: string;
  masked: string;
  created_at: string;
  last_used: string | null;
}

interface SubscriptionData {
  tier: string;
  tokens_limit: number;
  tokens_used: number;
  next_billing_date: string;
  status: string;
}

export default function AccountContent() {
  const { user, loading, logout } = useAuthContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({ old: "", new: "", confirm: "" });
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (activeTab === "api-keys" && user) {
      loadApiKeys();
    }
    if (activeTab === "billing" && user) {
      loadSubscription();
    }
  }, [activeTab, user]);

  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    setApiKeysError(null);
    try {
      const keys = await apiClient.getAPIKeys();
      setApiKeys(Array.isArray(keys) ? keys : []);
    } catch (error) {
      setApiKeysError(error instanceof Error ? error.message : "Failed to load API keys");
      setApiKeys([]);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const sub = await apiClient.getSubscription();
      setSubscription(sub as SubscriptionData);
    } catch {
      console.error("Failed to load subscription");
    }
  };

  const generateNewKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      const response = await apiClient.generateAPIKey(newKeyName);
      setApiKeys([...apiKeys, response as ApiKey]);
      setNewKeyName("");
      setShowNewKeyForm(false);
    } catch (error) {
      setApiKeysError(error instanceof Error ? error.message : "Failed to generate API key");
    }
  };

  const revokeKey = async (keyId: string, keyName: string) => {
    try {
      await apiClient.revokeAPIKey(keyName);
      setApiKeys(apiKeys.filter(k => (k.key_id || k.id) !== keyId));
    } catch (error) {
      setApiKeysError(error instanceof Error ? error.message : "Failed to revoke API key");
    }
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setPasswordChangeError("Passwords do not match");
      return;
    }
    
    if (passwordData.new.length < 8) {
      setPasswordChangeError("Password must be at least 8 characters");
      return;
    }
    
    try {
      await apiClient.changePassword(passwordData.old, passwordData.new);
      setPasswordChangeSuccess(true);
      setPasswordData({ old: "", new: "", confirm: "" });
      setPasswordChangeError(null);
      setTimeout(() => setPasswordChangeSuccess(false), 3000);
    } catch (error) {
      setPasswordChangeError(error instanceof Error ? error.message : "Failed to change password");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "subscription", label: "Subscription" },
    { id: "team", label: "Team Management" },
    { id: "support", label: "Support" },
    { id: "community", label: "Community" },
    { id: "enterprise", label: "Enterprise" },
    { id: "api-keys", label: "API Keys" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-white font-bold text-lg">
            Fortress
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              {/* User Card */}
              <div className="mb-8 pb-8 border-b border-slate-700">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold mb-3">
                  {user.name?.charAt(0) || "U"}
                </div>
                <h3 className="font-semibold text-white">{user.name}</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
                <p className="text-xs text-emerald-400 mt-2 capitalize">{user.tier} Tier</p>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      activeTab === tab.id
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Account Dashboard</h1>

                {/* Tier Badge */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <p className="text-sm text-emerald-300 mb-2">Current Plan</p>
                  <h2 className="text-2xl font-bold text-white capitalize">{user.tier}</h2>
                  <p className="text-slate-400 mt-1">Account created {new Date(user.created_at).toLocaleDateString()}</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-400 mb-2">Email Verified</p>
                    <p className="text-lg font-bold text-emerald-400">✓</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-400 mb-2">API Keys</p>
                    <p className="text-lg font-bold text-white">{apiKeys.length}</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
                  <h3 className="font-semibold text-white mb-2">Upgrade your plan</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Get more tokens, priority support, and advanced features.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-block px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "api-keys" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-white">API Keys</h1>
                  <button
                    onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium"
                  >
                    {showNewKeyForm ? "Cancel" : "Generate Key"}
                  </button>
                </div>

                {apiKeysError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
                    {apiKeysError}
                  </div>
                )}

                {showNewKeyForm && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                    <h3 className="font-semibold text-white mb-4">Create New API Key</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Key Name
                        </label>
                        <input
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production API Key"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Provide a descriptive name to identify what this key is used for.
                      </p>
                      <button
                        onClick={generateNewKey}
                        disabled={!newKeyName.trim() || apiKeysLoading}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50"
                      >
                        {apiKeysLoading ? "Creating..." : "Create Key"}
                      </button>
                    </div>
                  </div>
                )}

                {apiKeysLoading ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <p className="text-slate-400">Loading API keys...</p>
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {apiKeys.map((apiKey) => (
                      <div key={apiKey.key_id || apiKey.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-white">{apiKey.name}</h3>
                            <p className="text-xs text-slate-400">Created {new Date(apiKey.created_at).toLocaleDateString()}</p>
                          </div>
                          <button
                            onClick={() => revokeKey(apiKey.key_id || apiKey.id || "", apiKey.name)}
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                          >
                            Revoke
                          </button>
                        </div>

                        {apiKey.key && (
                          <div className="bg-slate-950/50 rounded-lg p-3 mb-3 border border-slate-700">
                            <div className="flex justify-between items-center">
                              <code className="text-sm text-slate-300 font-mono">{apiKey.masked}</code>
                              <button
                                onClick={() => {
                                  if (apiKey.key) {
                                    navigator.clipboard.writeText(apiKey.key);
                                    setCopiedKey(apiKey.key_id || apiKey.id || "");
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }
                                }}
                                className="ml-2 px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                              >
                                {copiedKey === (apiKey.key_id || apiKey.id) ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          </div>
                        )}

                        {apiKey.last_used ? (
                          <p className="text-xs text-slate-400">
                            Last used: <span className="text-slate-300">{new Date(apiKey.last_used).toLocaleDateString()}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500">Never used</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <p className="text-slate-400 mb-4">No API keys yet. Create your first one to get started.</p>
                    <button
                      onClick={() => setShowNewKeyForm(true)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                      Generate First Key
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "subscription" && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-6">Subscription & Billing</h1>
                <SubscriptionManagement
                  currentTier={user.tier || "free"}
                  currentPrice={user.tier === "starter" ? 9.99 : user.tier === "teams" ? 99 : 0}
                  nextBillingDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
                  usagePercentage={subscription ? Math.round((subscription.tokens_used / subscription.tokens_limit) * 100) : 0}
                />
              </div>
            )}

            {activeTab === "team" && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-6">Team Management</h1>
                <TeamManagement
                  userTier={user.tier || "free"}
                  teamName="Development Team"
                  teamMembers={[
                    { id: "1", email: "you@company.com", name: user.name || "You", role: "owner", joinedAt: new Date().toISOString() }
                  ]}
                />
              </div>
            )}

            {activeTab === "support" && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-6">Support & Help</h1>
                <SupportSystem
                  userTier={user.tier || "free"}
                  tickets={[]}
                />
              </div>
            )}

            {activeTab === "community" && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-6">Community & Resources</h1>
                <CommunityPortal />
              </div>
            )}

            {activeTab === "enterprise" && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-6">Enterprise Solutions</h1>
                <EnterpriseFeatures />
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Billing & Usage</h1>
                
                {subscription ? (
                  <>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                      <p className="text-sm text-slate-400 mb-2">Current Tier</p>
                      <h2 className="text-2xl font-bold text-white capitalize">{subscription.tier}</h2>
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Tokens Used</span>
                          <span className="text-white font-bold">{subscription.tokens_used.toLocaleString()} / {subscription.tokens_limit.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3">
                          <div 
                            className="bg-emerald-500 h-3 rounded-full" 
                            style={{ width: `${Math.min(100, (subscription.tokens_used / subscription.tokens_limit) * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-400">
                          Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
                      <h3 className="font-semibold text-white mb-2">Upgrade or Downgrade</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Change your subscription tier to adjust your token limits.
                      </p>
                      <Link
                        href="/pricing"
                        className="inline-block px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                      >
                        View All Plans
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <p className="text-slate-400">Loading billing information...</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Account Settings</h1>
                
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-white mb-4">Account Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-400"
                        />
                        <p className="text-xs text-slate-500 mt-1">✓ Email verified</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={user.name}
                          disabled
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-6">
                    <h3 className="font-semibold text-white mb-4">Change Password</h3>
                    
                    {passwordChangeSuccess && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-400 text-sm mb-4">
                        Password changed successfully!
                      </div>
                    )}
                    
                    {passwordChangeError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm mb-4">
                        {passwordChangeError}
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.old}
                          onChange={(e) => setPasswordData({ ...passwordData, old: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.new}
                          onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                          placeholder="At least 8 characters"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                        />
                      </div>
                      <button
                        onClick={changePassword}
                        disabled={!passwordData.old || !passwordData.new || !passwordData.confirm}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
