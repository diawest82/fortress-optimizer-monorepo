'use client';

import { ExternalLink, MessageCircle, Users, Github } from 'lucide-react';

interface CommunityLink {
  platform: string;
  name: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  memberCount?: string;
}

export default function CommunityPortal() {
  const communityLinks: CommunityLink[] = [
    {
      platform: 'discord',
      name: 'Discord Server',
      description: 'Chat with 2000+ community members, get real-time help, and connect with other users',
      url: 'https://discord.gg/fortress-optimizer',
      icon: <MessageCircle className="w-6 h-6" />,
      memberCount: '2,000+',
    },
    {
      platform: 'github',
      name: 'GitHub Discussions',
      description: 'Share ideas, discuss features, and collaborate with developers on the roadmap',
      url: 'https://github.com/fortress-optimizer/discussions',
      icon: <Github className="w-6 h-6" />,
      memberCount: '500+',
    },
    {
      platform: 'forum',
      name: 'Community Forum',
      description: 'Deep-dive discussions, feature requests, and shared knowledge base articles',
      url: 'https://community.fortress-optimizer.com',
      icon: <Users className="w-6 h-6" />,
      memberCount: '1,000+',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-3">Join the Community</h2>
          <p className="text-slate-300 mb-6">
            Connect with 8,000+ developers using Fortress Token Optimizer. Share tips, get help, discuss features, and collaborate on the future of prompt optimization.
          </p>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">8,000+ active community members</span>
          </div>
        </div>
      </div>

      {/* Community Channels */}
      <div className="grid md:grid-cols-2 gap-4">
        {communityLinks.map((link) => (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-slate-700 bg-slate-900/50 p-6 hover:border-slate-600 hover:bg-slate-800/50 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-slate-800 text-emerald-400 group-hover:bg-slate-700 transition">
                {link.icon}
              </div>
              <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{link.name}</h3>
            <p className="text-sm text-slate-400 mb-4 group-hover:text-slate-300 transition">
              {link.description}
            </p>
            {link.memberCount && (
              <p className="text-xs text-emerald-400 font-semibold">
                {link.memberCount} members
              </p>
            )}
          </a>
        ))}
      </div>

      {/* Popular Topics */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Popular Discussion Topics</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { tag: 'prompt-tips', count: 342, label: 'Prompt Optimization Tips' },
            { tag: 'integrations', count: 189, label: 'Integration Help' },
            { tag: 'feature-requests', count: 156, label: 'Feature Requests' },
            { tag: 'success-stories', count: 203, label: 'Success Stories' },
            { tag: 'best-practices', count: 128, label: 'Best Practices' },
            { tag: 'troubleshooting', count: 94, label: 'Troubleshooting' },
          ].map((topic) => (
            <a
              key={topic.tag}
              href={`#${topic.tag}`}
              className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition"
            >
              <span className="font-medium text-slate-300 group-hover:text-white">
                #{topic.label}
              </span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {topic.count}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Getting Help */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Getting Help</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: '📚',
              title: 'Documentation',
              desc: 'Read our comprehensive guides and installation docs',
              link: '/install',
            },
            {
              icon: '🎥',
              title: 'Video Tutorials',
              desc: 'Step-by-step video guides for all features',
              link: '/install',
            },
            {
              icon: '💬',
              title: 'FAQ',
              desc: 'Common questions and quick answers',
              link: '/support',
            },
          ].map((resource, idx) => (
            <a
              key={idx}
              href={resource.link}
              target={resource.link.startsWith('http') ? '_blank' : undefined}
              rel={resource.link.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition text-center"
            >
              <div className="text-2xl mb-2">{resource.icon}</div>
              <h4 className="font-semibold text-white mb-1">{resource.title}</h4>
              <p className="text-xs text-slate-400">{resource.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Community Guidelines */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Community Guidelines</h3>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
            <span>Be respectful and inclusive - we welcome all skill levels</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
            <span>Search before posting - your question might already be answered</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
            <span>Share your experience - help others by posting solutions and tips</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
            <span>No spam or self-promotion - we prefer genuine community interaction</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
            <span>Report issues responsibly - use responsible disclosure for security issues</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
