'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  country: string;
  lastActivity: string;
  isCurrent: boolean;
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showConfirmRevokeAll, setShowConfirmRevokeAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/security/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId);
      const response = await fetch(`/api/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to revoke session');
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOthers = async () => {
    try {
      setLoading(true);
      const currentSession = sessions.find(s => s.isCurrent);
      const otherSessions = sessions.filter(s => !s.isCurrent);
      
      await Promise.all(
        otherSessions.map(s => fetch(`/api/security/sessions/${s.id}/revoke`, { method: 'POST' }))
      );
      
      setSessions(currentSession ? [currentSession] : []);
      setShowConfirmRevokeAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg border border-slate-800 bg-slate-950/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-100">{error}</p>
            <button
              onClick={fetchSessions}
              className="mt-2 text-sm text-red-200 hover:text-red-100 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
          <p className="mt-1 text-sm text-slate-400">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} active
          </p>
        </div>
        {otherSessions.length > 0 && (
          <button
            onClick={() => setShowConfirmRevokeAll(true)}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20 transition"
          >
            Revoke All Others
          </button>
        )}
      </div>

      {showConfirmRevokeAll && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-100 mb-3">
            Are you sure you want to revoke all other sessions? You&apos;ll need to sign in again on those devices.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirmRevokeAll(false)}
              className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={revokeAllOthers}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-xs font-semibold text-white transition"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`rounded-lg border p-4 ${
              session.isCurrent
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-slate-800 bg-slate-950/50 hover:bg-slate-900/50'
            } transition`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-white truncate">{session.device}</h4>
                  {session.isCurrent && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-100">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {session.browser} • {session.ip}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {session.country} • Last active: {session.lastActivity}
                </p>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  className="flex-shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 p-2.5 transition"
                  title="Revoke this session"
                >
                  {revoking === session.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
                  ) : (
                    <X className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
