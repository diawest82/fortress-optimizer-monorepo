'use client';

import { useState } from 'react';
import { Mail, MessageSquare, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  lastUpdated: string;
  responses: number;
}

interface SupportSystemProps {
  userTier: string;
  tickets?: Ticket[];
  onCreateTicket?: (data: any) => void;
}

export default function SupportSystem({
  userTier,
  tickets = [],
  onCreateTicket = () => {},
}: SupportSystemProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    priority: 'normal',
    description: '',
  });

  const supportLevelMap = {
    free: { level: 'Community', responseTime: '48-72 hours', icon: '💬' },
    starter: { level: 'Email', responseTime: '24-48 hours', icon: '📧' },
    teams: { level: 'Priority', responseTime: '4-8 hours', icon: '⚡' },
    enterprise: { level: '24/7 Premium', responseTime: '1 hour', icon: '🔴' },
  };

  const currentSupport = supportLevelMap[userTier as keyof typeof supportLevelMap] || supportLevelMap.free;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'in-progress':
        return <Zap className="w-5 h-5 text-blue-400" />;
      case 'waiting':
        return <Clock className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'normal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.description) {
      alert('Please fill in all fields');
      return;
    }

    onCreateTicket(formData);
    setFormData({ subject: '', category: 'technical', priority: 'normal', description: '' });
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Support Level Banner */}
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{currentSupport.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-white">{currentSupport.level} Support</h3>
              <p className="text-sm text-slate-400">
                Response time: <span className="text-emerald-400 font-semibold">{currentSupport.responseTime}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
          >
            New Ticket
          </button>
        </div>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Create Support Ticket</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
              <input
                type="text"
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing</option>
                  <option value="feature-request">Feature Request</option>
                  <option value="account">Account Help</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                placeholder="Please provide as much detail as possible"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Your Tickets</h4>
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No support tickets yet</p>
            <p className="text-sm text-slate-500">Create one above if you need help</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <p className="font-medium text-white">{ticket.subject}</p>
                      <p className="text-xs text-slate-400">{ticket.ticketNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </span>
                  <span className="text-sm text-slate-400">{ticket.responses} responses</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Options */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-center">
          <Mail className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <h4 className="font-semibold text-white mb-2">Email Support</h4>
          <a href="mailto:support@fortress-optimizer.com" className="text-emerald-400 hover:text-emerald-300 text-sm">
            support@fortress-optimizer.com
          </a>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-center">
          <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <h4 className="font-semibold text-white mb-2">Community Support</h4>
          <a href="#" className="text-blue-400 hover:text-blue-300 text-sm">
            Join Discord Community
          </a>
        </div>
      </div>
    </div>
  );
}
