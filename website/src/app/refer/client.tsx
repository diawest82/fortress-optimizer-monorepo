'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Copy, Twitter, Linkedin, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { default as dynamicComponent } from 'next/dynamic';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  topReferrers: Array<{
    rank: number;
    user: string;
    referrals: number;
    earnings: number;
    reward: string;
  }>;
}

function ReferralLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 pt-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Share Fortress. Get Rewarded.</h1>
          <p className="text-xl md:text-2xl text-zinc-300 mb-8 max-w-3xl mx-auto">
            Refer developers to Fortress Token Optimizer and earn $10 credit for every friend who signs up.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition text-lg"
          >
            Sign In to Get Your Link
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-3">Easy Earnings</h3>
            <p className="text-zinc-400">
              Earn $10 in credits for every developer who signs up through your referral link.
            </p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-3">Track Everything</h3>
            <p className="text-zinc-400">
              Monitor your referrals, pending conversions, and earnings in real-time on your dashboard.
            </p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-3">Win Prizes</h3>
            <p className="text-zinc-400">
              Top referrers earn exclusive rewards: 1 year, 6 months, or 3 months of free Pro access.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-lg p-12 border border-zinc-700 mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold mb-2">Get Your Link</h3>
              <p className="text-zinc-400">Sign in and get your unique referral link</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold mb-2">Share</h3>
              <p className="text-zinc-400">Share with friends via Twitter, LinkedIn, email or copy the link</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold mb-2">Earn</h3>
              <p className="text-zinc-400">Get $10 credit when they sign up and complete setup</p>
            </div>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Top Referrers</h2>
          <p className="text-zinc-400 mb-8">Sign in to see the leaderboard and start earning today</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReferralDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get referral code
      const codeRes = await fetch('/api/referral/code');
      const codeData = await codeRes.json();
      setReferralLink(codeData.link);

      // Get stats
      const statsRes = await fetch('/api/referral/stats');
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOn = (platform: string) => {
    const text = `I'm saving 18% on my LLM costs with Fortress Token Optimizer. Try it free: ${referralLink}`;

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        '_blank'
      );
    } else if (platform === 'linkedin') {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
        '_blank'
      );
    } else if (platform === 'email') {
      window.open(
        `mailto:?subject=Fortress Token Optimizer&body=${encodeURIComponent(text)}`,
        '_blank'
      );
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <ReferralLandingPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Share Fortress. Get Rewards.</h1>
          <p className="text-xl text-zinc-300">
            Earn $10 credit for every friend who signs up
          </p>
        </div>

        {/* Referral Link Section */}
        <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-lg p-8 mb-8 border border-zinc-700">
          <h2 className="text-lg font-semibold mb-4">Your Referral Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-black rounded-lg px-4 py-2 text-white font-mono text-sm border border-zinc-700"
            />
            <button
              onClick={copyToClipboard}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Copy size={18} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <button
            onClick={() => shareOn('twitter')}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition"
          >
            <Twitter size={24} />
            <span className="text-sm font-semibold">Twitter</span>
          </button>
          <button
            onClick={() => shareOn('linkedin')}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition"
          >
            <Linkedin size={24} />
            <span className="text-sm font-semibold">LinkedIn</span>
          </button>
          <button
            onClick={() => shareOn('email')}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition"
          >
            <Mail size={24} />
            <span className="text-sm font-semibold">Email</span>
          </button>
          <button
            onClick={copyToClipboard}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition"
          >
            <Copy size={24} />
            <span className="text-sm font-semibold">Copy Link</span>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                <div className="text-sm text-zinc-400 mb-2">Total Referrals</div>
                <div className="text-4xl font-bold">{stats.totalReferrals}</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                <div className="text-sm text-zinc-400 mb-2">Completed</div>
                <div className="text-4xl font-bold text-green-400">{stats.completedReferrals}</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                <div className="text-sm text-zinc-400 mb-2">Your Earnings</div>
                <div className="text-4xl font-bold text-blue-400">${stats.totalEarnings.toFixed(2)}</div>
              </div>
            </div>

            {/* Leaderboard */}
            {stats.topReferrers.length > 0 && (
              <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700">
                <h2 className="text-2xl font-bold mb-6">🏆 Top Referrers</h2>
                <div className="space-y-3">
                  {stats.topReferrers.map((referrer) => (
                    <div
                      key={referrer.rank}
                      className="flex justify-between items-center p-4 bg-zinc-900 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-zinc-500 w-8">
                          {referrer.rank === 1 && '🥇'}
                          {referrer.rank === 2 && '🥈'}
                          {referrer.rank === 3 && '🥉'}
                          {referrer.rank > 3 && `#${referrer.rank}`}
                        </div>
                        <div>
                          <div className="font-semibold">{referrer.user}</div>
                          <div className="text-sm text-zinc-400">
                            {referrer.referrals} referrals • ${referrer.earnings.toFixed(2)} earned
                          </div>
                        </div>
                      </div>
                      {referrer.reward && (
                        <div className="text-sm text-green-400 font-semibold text-right">
                          {referrer.reward}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Referrals */}
            {stats.pendingReferrals > 0 && (
              <div className="mt-8 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-6">
                <h3 className="font-semibold text-yellow-300 mb-2">Pending Referrals</h3>
                <p className="text-sm text-zinc-300">
                  You have {stats.pendingReferrals} pending referral(s) awaiting completion.
                </p>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-zinc-400 mb-4">Want to earn more?</p>
          <p className="text-sm text-zinc-500">Share your link with developers who optimize AI costs</p>
        </div>
      </div>
    </div>
  );
}

export default dynamicComponent(() => Promise.resolve(ReferralPageContent), {
  ssr: false
});

function ReferralPageContent() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <ReferralLandingPage />;
  }

  return <ReferralDashboard />;
}
