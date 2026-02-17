'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function SiteNav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Defer state update to avoid synchronous call warning
    const timer = setTimeout(() => {
      const token = localStorage.getItem('adminToken');
      setIsAuthenticated(!!token);
    }, 0);

    // Listen for storage changes
    const handleStorageChange = () => {
      const token = localStorage.getItem('adminToken');
      setIsAuthenticated(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <nav className="flex gap-6 items-center">
      <Link className="text-slate-300 hover:text-white transition" href="/support">
        Support
      </Link>
      {!isAuthenticated && (
        <Link className="text-slate-300 hover:text-white transition" href="/auth/login">
          Sign In
        </Link>
      )}
    </nav>
  );
}
