'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export function SiteNav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check auth via cookie (httpOnly cookie is set by server,
    // but we can check for the non-httpOnly auth indicator cookie)
    const checkAuth = () => {
      const hasCookie = document.cookie.includes('fortress_auth_token');
      const hasLocalToken = localStorage.getItem('auth_token');
      setIsAuthenticated(hasCookie || !!hasLocalToken);
    };

    const timer = setTimeout(checkAuth, 0);

    // Re-check on storage/visibility changes
    window.addEventListener('storage', checkAuth);
    document.addEventListener('visibilitychange', checkAuth);

    // Poll every 2s to catch cookie changes (cookie changes don't fire events)
    const interval = setInterval(checkAuth, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', checkAuth);
      document.removeEventListener('visibilitychange', checkAuth);
      clearInterval(interval);
    };
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  const handleSignOut = () => {
    // Clear cookie by setting expired date
    document.cookie = 'fortress_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Also clear any localStorage remnants
    localStorage.removeItem('auth_token');
    localStorage.removeItem('api_key');
    setIsAuthenticated(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Install', href: '/install' },
    { label: 'Why Fortress', href: '/compare' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: '/docs' },
    { label: 'Support', href: '/support' },
    { label: 'Legal', href: '/legal/terms' },
  ];

  const authenticatedItems = [
    { label: 'Referrals', href: '/refer' },
    { label: 'Account', href: '/account' },
  ];

  const unauthenticatedItems = [
    { label: 'Tools', href: '/tools' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-4 lg:gap-8 items-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className="text-sm text-slate-300 hover:text-white transition"
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {item.label}
          </Link>
        ))}
        
        {!isAuthenticated && (
          <Link
            className="text-sm text-slate-300 hover:text-white transition"
            href="/tools"
            data-testid="nav-tools"
          >
            Tools
          </Link>
        )}

        {isAuthenticated ? (
          <>
            {authenticatedItems.map((item) => (
              <Link
                key={item.href}
                className="text-sm text-slate-300 hover:text-white transition"
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-300 hover:text-white transition cursor-pointer"
              data-testid="nav-sign-out"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            className="text-sm text-slate-300 hover:text-white transition"
            href="/auth/login"
            data-testid="nav-sign-in"
          >
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 text-slate-300 hover:text-white transition"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-950 border-b border-slate-800 z-50">
          <nav className="flex flex-col gap-1 px-6 py-4 text-sm text-slate-300">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="py-3 px-4 rounded-lg hover:bg-slate-800 hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}

            {!isAuthenticated && (
              <Link
                href="/tools"
                onClick={closeMobileMenu}
                className="py-3 px-4 rounded-lg hover:bg-slate-800 hover:text-white transition"
              >
                Tools
              </Link>
            )}

            <div className="border-t border-slate-800 mt-2 pt-2">
              {isAuthenticated ? (
                <>
                  {authenticatedItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="py-3 px-4 rounded-lg hover:bg-slate-800 hover:text-white transition block"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left py-3 px-4 rounded-lg hover:bg-slate-800 hover:text-white transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={closeMobileMenu}
                  className="py-3 px-4 rounded-lg hover:bg-slate-800 hover:text-white transition block"
                >
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
