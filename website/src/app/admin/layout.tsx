'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check auth immediately, no loading screen
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    // Use microtask to avoid cascading renders
    Promise.resolve().then(() => {
      setIsAuthenticated(true);
    });
  }, [router]);

  // Show nothing while checking auth (silent redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Admin Navigation Bar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="font-bold tracking-tight">Admin</span>
          </Link>
          
          <div className="flex gap-8">
            <Link
              href="/admin"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/emails"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Emails
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Users
            </Link>
            <Link
              href="/admin/settings"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Settings
            </Link>
            <Link
              href="/admin/notifications"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Notifications
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                window.dispatchEvent(new Event('storage'));
                router.push('/');
              }}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
