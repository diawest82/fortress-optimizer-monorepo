'use client';

import { useState } from 'react';
import { Users, Plus, Trash2, Shield, Check, X } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface TeamManagementProps {
  userTier: string;
  teamName?: string;
  teamMembers?: TeamMember[];
  onAddMember?: (email: string) => void;
  onRemoveMember?: (memberId: string) => void;
}

export default function TeamManagement({
  userTier,
  teamName = 'My Team',
  teamMembers = [],
  onAddMember = () => {},
  onRemoveMember = () => {},
}: TeamManagementProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingError, setInvitingError] = useState<string | null>(null);
  const [invitingSuccess, setInvitingSuccess] = useState(false);

  const isTeamsTier = userTier === 'teams' || userTier === 'enterprise';
  const maxSeats = userTier === 'enterprise' ? 999 : 5;

  const handleInvite = async () => {
    if (!inviteEmail) {
      setInvitingError('Please enter an email address');
      return;
    }

    if (teamMembers.length >= maxSeats) {
      setInvitingError(`Team is at maximum capacity (${maxSeats} seats)`);
      return;
    }

    try {
      onAddMember(inviteEmail);
      setInviteEmail('');
      setInvitingSuccess(true);
      setTimeout(() => setInvitingSuccess(false), 3000);
    } catch (error) {
      setInvitingError(error instanceof Error ? error.message : 'Failed to send invite');
    }
  };

  if (!isTeamsTier) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
        <div className="flex items-start gap-4">
          <div className="text-4xl">👥</div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Team Management</h3>
            <p className="text-slate-400 mb-4">
              Upgrade to <span className="font-semibold text-cyan-400">Teams ($99/month)</span> to:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Invite up to 5 team members
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Share team workspace and API keys
              </li>
              <li className="flex items items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Assign roles (Owner, Admin, Member)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Team analytics & usage tracking
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Slack integration for team alerts
              </li>
            </ul>
            <button className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition">
              Upgrade to Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{teamName}</h3>
              <p className="text-sm text-slate-400">
                {teamMembers.length} / {maxSeats} members
              </p>
            </div>
          </div>
          {teamMembers.length < maxSeats && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInvitingError(null);
                }}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleInvite}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
              >
                Send Invite
              </button>
            </div>
            {invitingError && <p className="text-red-400 text-sm">{invitingError}</p>}
            {invitingSuccess && <p className="text-emerald-400 text-sm">✓ Invite sent successfully</p>}
          </div>
        )}

        {/* Team Members */}
        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
                    {member.name?.charAt(0) || member.email.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{member.name || member.email}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {member.role === 'owner' ? (
                    <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-300 rounded text-xs font-semibold">
                      <Shield className="w-3 h-3" />
                      Owner
                    </div>
                  ) : (
                    <select
                      defaultValue={member.role}
                      className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Info */}
      {userTier === 'teams' && (
        <div className="rounded-2xl border border-purple-700/30 bg-purple-950/20 p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚀</div>
            <div>
              <h4 className="font-semibold text-white mb-2">Need More Seats?</h4>
              <p className="text-sm text-slate-300 mb-3">
                Upgrade to <span className="font-semibold text-purple-300">Enterprise</span> for unlimited team members and advanced features
              </p>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition text-sm">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
