'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthContext();

  // Login and setup pages bypass auth check
  const isPublicAdminPage = pathname === '/admin/login' || pathname === '/admin/setup';

  const isAdmin = (user as any)?.role === 'admin';

  useEffect(() => {
    if (isPublicAdminPage) return;
    if (loading) return;
    if (!user) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!isAdmin) {
      router.push('/account');
    }
  }, [router, isPublicAdminPage, loading, user, isAdmin, pathname]);

  // Public admin pages render without nav
  if (isPublicAdminPage) {
    return <>{children}</>;
  }

  // Show nothing while checking auth (silent redirect)
  if (loading || !user || !isAdmin) {
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
            <Link
              href="/account"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Exit Admin
            </Link>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                } catch {
                  // server-side cookie clear failed, fall through to client clear
                }
                document.cookie = 'fortress_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'fortress_csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
