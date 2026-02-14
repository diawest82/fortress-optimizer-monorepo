import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fortress Token Optimizer - Live Demo",
  description: "Optimize AI token usage across 15+ platforms. See it working in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <nav className="border-b border-zinc-800 sticky top-0 z-50 bg-black/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold">Fortress</span>
            </div>
            <div className="flex gap-8">
              <a href="/" className="hover:text-blue-400 transition">Home</a>
              <a href="/dashboard" className="hover:text-blue-400 transition">Dashboard</a>
              <a href="/install" className="hover:text-blue-400 transition">Install</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
