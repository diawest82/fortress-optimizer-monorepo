"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  masked: string;
  created: string;
  lastUsed: string | null;
}

export default function AccountContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "key_1",
      name: "Production API Key",
      key: "fk_prod_abc123def456ghi789jkl012mno345",
      masked: "fk_prod_abc123def456••••••••••••••••••••",
      created: "2024-01-15",
      lastUsed: "2024-01-20"
    },
    {
      id: "key_2",
      name: "Development Key",
      key: "fk_dev_xyz789uvw456rst123pqr890stu567",
      masked: "fk_dev_xyz789uvw456••••••••••••••••••••",
      created: "2024-01-10",
      lastUsed: null
    }
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (!session) {
    return null;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "api-keys", label: "API Keys" },
    { id: "billing", label: "Billing & Usage" },
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
            <span className="text-slate-400">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
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
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <h3 className="font-semibold text-white">{session.user?.name}</h3>
                <p className="text-xs text-slate-400">{session.user?.email}</p>
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
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>

                {/* Tier Badge */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <p className="text-sm text-emerald-300 mb-2">Current Plan</p>
                  <h2 className="text-2xl font-bold text-white">Free</h2>
                  <p className="text-slate-400 mt-1">50K tokens/month • No credit card required</p>
                </div>

                {/* Usage Stats */}
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <p className="text-sm text-slate-400 mb-2">Tokens Used This Month</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-white">12.4M</p>
                      <span className="text-slate-400">/ Unlimited</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "24%" }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                      <p className="text-xs text-slate-400 mb-1">Requests</p>
                      <p className="text-2xl font-bold text-white">3,245</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                      <p className="text-xs text-slate-400 mb-1">Channels Active</p>
                      <p className="text-2xl font-bold text-white">2/5</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
                  <h3 className="font-semibold text-white mb-2">Ready to scale?</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Upgrade to Pro for unlimited tokens and advanced analytics.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-block px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  >
                    View Pro Pricing
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
                        onClick={() => {
                          if (newKeyName.trim()) {
                            const newKey: ApiKey = {
                              id: `key_${Date.now()}`,
                              name: newKeyName,
                              key: `fk_prod_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
                              masked: `fk_prod_${Math.random().toString(36).substring(2, 15).substring(0, 6)}••••••••••••••••••••`,
                              created: new Date().toISOString().split('T')[0],
                              lastUsed: null
                            };
                            setApiKeys([...apiKeys, newKey]);
                            setNewKeyName("");
                            setShowNewKeyForm(false);
                          }
                        }}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
                      >
                        Create Key
                      </button>
                    </div>
                  </div>
                )}

                {apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-white">{apiKey.name}</h3>
                            <p className="text-xs text-slate-400">Created {apiKey.created}</p>
                          </div>
                          <button
                            onClick={() => setApiKeys(apiKeys.filter(k => k.id !== apiKey.id))}
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                          >
                            Revoke
                          </button>
                        </div>

                        <div className="bg-slate-950/50 rounded-lg p-3 mb-3 border border-slate-700">
                          <div className="flex justify-between items-center">
                            <code className="text-sm text-slate-300 font-mono">{apiKey.masked}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(apiKey.key);
                                setCopiedKey(apiKey.id);
                                setTimeout(() => setCopiedKey(null), 2000);
                              }}
                              className="ml-2 px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                            >
                              {copiedKey === apiKey.id ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>

                        {apiKey.lastUsed ? (
                          <p className="text-xs text-slate-400">
                            Last used: <span className="text-slate-300">{apiKey.lastUsed}</span>
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

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="font-semibold text-white mb-3">How to Use Your API Key</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400 mb-2">
                        Add your API key to your tool&apos;s configuration:
                      </p>
                      <code className="block bg-slate-950 p-2 rounded text-slate-300 font-mono text-xs overflow-x-auto">
                        FORTRESS_API_KEY=fk_prod_abc123def456...
                      </code>
                    </div>
                    <p className="text-slate-400">
                      Visit <Link href="/docs" className="text-emerald-400 hover:underline">our documentation</Link> for integration guides with npm, VS Code, GitHub Copilot, Slack, and Claude Desktop.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Billing & Usage</h1>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <p className="text-slate-400 mb-4">You&apos;re on the Free plan.</p>
                  <p className="text-slate-400 text-sm mb-4">Upgrade to Pro or Team to see billing details.</p>
                  <Link
                    href="/pricing"
                    className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Account Settings</h1>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={session.user?.email || ""}
                      disabled
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={session.user?.name || ""}
                      disabled
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-400"
                    />
                  </div>
                  <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                    Change Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
