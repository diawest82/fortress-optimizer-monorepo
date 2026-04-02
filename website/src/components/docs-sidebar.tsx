'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';

const docStructure = {
  'Getting Started': [
    { label: 'Overview', slug: 'getting-started' },
    { label: 'What is Fortress', slug: 'what-is-fortress' },
    { label: 'Quick Start', slug: 'quick-start' },
  ],
  'Installation': [
    { label: 'npm Package', slug: 'installation/npm' },
    { label: 'GitHub Copilot', slug: 'installation/copilot' },
    { label: 'VS Code', slug: 'installation/vscode' },
    { label: 'Slack', slug: 'installation/slack' },
    { label: 'Claude Desktop', slug: 'installation/claude-desktop' },
    { label: 'JetBrains IDEs', slug: 'installation/jetbrains' },
    { label: 'Neovim', slug: 'installation/neovim' },
    { label: 'Sublime Text', slug: 'installation/sublime' },
    { label: 'Cursor', slug: 'installation/cursor' },
    { label: 'Anthropic SDK', slug: 'installation/anthropic-sdk' },
    { label: 'LangChain', slug: 'installation/langchain' },
    { label: 'Vercel AI SDK', slug: 'installation/vercel-ai-sdk' },
    { label: 'Make.com / Zapier', slug: 'installation/make-zapier' },
    { label: 'OpenClaw CLI', slug: 'installation/openclaw' },
  ],
  'Guides': [
    { label: 'How It Works', slug: 'guides/how-it-works' },
    { label: 'Best Practices', slug: 'guides/best-practices' },
    { label: 'How We Differ', slug: 'how-we-differ' },
  ],
  'API Reference': [
    { label: 'API Reference', slug: 'api-reference' },
  ],
};

export default function DocsSidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Getting Started': true,
    'Installation': true,
    'Guides': true,
    'API Reference': true,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const sidebarContent = (
    <nav className="space-y-6">
      {Object.entries(docStructure).map(([section, links]) => (
        <div key={section} className="space-y-2">
          <button
            onClick={() => toggleSection(section)}
            className="flex items-center justify-between w-full text-left font-semibold text-white hover:text-emerald-400 transition"
          >
            <span>{section}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                openSections[section] ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openSections[section] && (
            <ul className="space-y-1 pl-4">
              {links.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`/docs/${link.slug}`}
                    className="block py-1.5 text-slate-400 hover:text-emerald-400 transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-slate-900 border-r border-slate-700 p-6 overflow-y-auto
          transition-transform duration-300 z-40
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
