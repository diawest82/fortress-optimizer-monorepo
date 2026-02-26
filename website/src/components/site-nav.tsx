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
          >
            {item.label}
          </Link>
        ))}
        
        {!isAuthenticated && (
          <Link
            className="text-sm text-slate-300 hover:text-white transition"
            href="/tools"
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
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-300 hover:text-white transition cursor-pointer"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            className="text-sm text-slate-300 hover:text-white transition"
            href="/auth/login"
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
