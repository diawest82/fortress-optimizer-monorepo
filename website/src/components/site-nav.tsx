'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function SiteNav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Defer state update to avoid synchronous call warning
    const timer = setTimeout(() => {
      const token = localStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    }, 0);

    // Listen for storage changes
    const handleStorageChange = () => {
      const token = localStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('api_key');
    setIsAuthenticated(false);
    router.push('/');
  };

  return (
    <nav className="flex gap-6 items-center">
      <Link className="text-slate-300 hover:text-white transition" href="/">
        Home
      </Link>
      <Link className="text-slate-300 hover:text-white transition" href="/dashboard">
        Dashboard
      </Link>
      <Link className="text-slate-300 hover:text-white transition" href="/install">
        Install
      </Link>
      <Link className="text-slate-300 hover:text-white transition" href="/pricing">
        Pricing
      </Link>
      <Link className="text-slate-300 hover:text-white transition" href="/support">
        Support
      </Link>
      {isAuthenticated ? (
        <>
          <Link className="text-slate-300 hover:text-white transition" href="/account">
            Account
          </Link>
          <button
            onClick={handleSignOut}
            className="text-slate-300 hover:text-white transition cursor-pointer"
          >
            Sign Out
          </button>
        </>
      ) : (
        <Link className="text-slate-300 hover:text-white transition" href="/auth/login">
          Sign In
        </Link>
      )}
    </nav>
  );
}
