'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Trash2, Plus, Users } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'admin',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const newUser = await response.json();
      setUsers([newUser, ...users]);
      setFormData({ email: '', name: '', password: '', role: 'admin' });
      setShowCreateForm(false);
      setSuccess('User created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setUsers(users.filter(u => u.id !== userId));
      setSuccess('User deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-white">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 sticky top-16 z-40 bg-black/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">👥 User Management</h1>
                <p className="text-slate-400">Create and manage admin accounts</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition"
            >
              <Plus className="w-4 h-4" />
              New User
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-300">{success}</p>
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-8">
            <h2 className="text-lg font-bold text-white mb-6">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-6 py-2 text-sm font-semibold text-white transition"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-slate-700 hover:border-slate-600 px-6 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        {users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400">No users found. Create the first admin account!</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-900/30 transition">
                    <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.name || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
