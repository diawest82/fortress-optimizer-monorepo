"use client";

import Link from "next/link";
import Logo from "@/components/logo";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { label: "Demos", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Install", href: "/install" },
  { label: "Pricing", href: "/pricing" },
  { label: "Support", href: "/support" },
];

export default function SiteHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-0 transition hover:opacity-80">
          <Logo variant="full" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <Link
                href="/account"
                className="text-sm text-slate-300 hover:text-white transition"
              >
                {session.user?.email}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-slate-300 hover:text-white transition"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-400/20 transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
