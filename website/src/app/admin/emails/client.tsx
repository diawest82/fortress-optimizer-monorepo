'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';

interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  timestamp: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  category?: string;
  isEnterprise?: boolean;
  requiresHuman?: boolean;
  aiRecommendation?: string;
}

export default function EmailAdminClient() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'enterprise' | 'requires-human'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let url = '/api/emails';
      
      if (filter === 'unread') {
        url += '?status=unread';
      } else if (filter === 'enterprise') {
        url = '/api/emails/enterprise';
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/emails/stats/unread');
      const data = await response.json();
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchEmails();
    fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleMarkAsRead = async (emailId: string) => {
    try {
      const response = await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      });
      
      if (response.ok) {
        fetchEmails();
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error updating email:', error);
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'enterprise':
        return 'bg-blue-100 text-blue-800';
      case 'support':
        return 'bg-red-100 text-red-800';
      case 'sales':
        return 'bg-green-100 text-green-800';
      case 'feedback':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category?: string, isEnterprise?: boolean) => {
    if (isEnterprise) return '🏢';
    switch (category) {
      case 'support':
        return '❓';
      case 'sales':
        return '💼';
      case 'enterprise':
        return '🏢';
      case 'feedback':
        return '💡';
      default:
        return '📧';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 sticky top-16 z-40 bg-black/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📧 Email Dashboard</h1>
              <p className="text-slate-400">Manage incoming customer emails and inquiries</p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition"
            >
              📊 View Metrics
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">Total Emails</p>
            <p className="text-2xl font-bold text-white mt-2">{emails.length}</p>
          </div>
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm">Unread</p>
            <p className="text-2xl font-bold text-white mt-2">{unreadCount}</p>
          </div>
          <div className="bg-green-950/40 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-300 text-sm">Requires Action</p>
            <p className="text-2xl font-bold text-white mt-2">
              {emails.filter(e => e.requiresHuman).length}
            </p>
          </div>
          <div className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-300 text-sm">Enterprise</p>
            <p className="text-2xl font-bold text-white mt-2">
              {emails.filter(e => e.isEnterprise).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread', 'enterprise'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Email List */}
          <div className="col-span-2">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading emails...</div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No emails found</div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-4 cursor-pointer transition ${
                        selectedEmail?.id === email.id
                          ? 'bg-blue-950/40'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {getCategoryIcon(email.category, email.isEnterprise)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white truncate">
                              {email.subject}
                            </h3>
                            {email.status === 'unread' && (
                              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                            )}
                            {email.isEnterprise && (
                              <span className="px-2 py-0.5 bg-red-950/40 text-red-300 text-xs rounded">
                                ENTERPRISE
                              </span>
                            )}
                            {email.requiresHuman && (
                              <span className="px-2 py-0.5 bg-yellow-950/40 text-yellow-300 text-xs rounded">
                                URGENT
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 truncate">{email.from}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(email.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Details */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            {selectedEmail ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedEmail.subject}</h2>
                  <p className="text-sm text-slate-400 mt-1">From: {selectedEmail.from}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(selectedEmail.timestamp).toLocaleString()}
                  </p>
                </div>

                {selectedEmail.isEnterprise && (
                  <div className="bg-red-950/20 border border-red-500/30 rounded p-3">
                    <p className="text-red-300 text-sm font-semibold">
                      ⚠️ Enterprise Query
                    </p>
                    <p className="text-red-200 text-xs mt-1">
                      Route to enterprise sales team
                    </p>
                  </div>
                )}

                {selectedEmail.requiresHuman && (
                  <div className="bg-yellow-950/20 border border-yellow-500/30 rounded p-3">
                    <p className="text-yellow-300 text-sm font-semibold">
                      🚩 Requires Human Review
                    </p>
                  </div>
                )}

                {selectedEmail.category && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Category</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(selectedEmail.category)}`}>
                      {selectedEmail.category}
                    </span>
                  </div>
                )}

                {selectedEmail.aiRecommendation && (
                  <div className="bg-blue-950/20 border border-blue-500/30 rounded p-3">
                    <p className="text-blue-300 text-sm font-semibold mb-2">
                      💡 AI Recommendation
                    </p>
                    <p className="text-blue-200 text-xs">
                      {selectedEmail.aiRecommendation}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-400 mb-2">Message</p>
                  <div className="bg-slate-950/50 rounded p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {selectedEmail.body}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {selectedEmail.status === 'unread' && (
                    <button
                      onClick={() => handleMarkAsRead(selectedEmail.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-semibold transition"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm font-semibold transition">
                    Archive
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Select an email to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
