"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push(searchParams.get("callbackUrl") || "/account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Input */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          required
        />
      </div>

      {/* Password Input */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-200">
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Forgot?
          </Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          required
        />
      </div>

      {/* Stay Logged In */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500"
        />
        <span className="text-sm text-slate-300">Stay logged in</span>
      </label>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Log In Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 bg-slate-900/50 text-slate-400">Or</span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/account" })}
        className="w-full py-2 px-4 border border-slate-700 text-slate-300 font-semibold rounded-lg hover:border-slate-600 transition-colors"
      >
        Log in with Google
      </button>
    </form>
  );
}

export default function LogInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400">Optimize faster than ever</p>
        </div>

        {/* Form */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur">
          <Suspense fallback={<div className="text-white">Loading...</div>}>
            <LoginForm />
          </Suspense>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
