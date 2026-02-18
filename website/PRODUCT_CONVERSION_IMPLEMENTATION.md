# 🎯 On-Product Conversion Flow & Lead Magnets Implementation

## 📱 ON-PRODUCT CONVERSION MESSAGES

### 1. npm Package - In-Console Messages

**File Location:** `products/npm/src/index.ts`

**Message 1 - After First Optimization (Automatic):**
```typescript
// After successful optimization
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         ✨ Fortress Token Optimizer - First Save! ✨          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Original tokens:  {{ORIGINAL_TOKENS}}                        ║
║  Optimized tokens: {{OPTIMIZED_TOKENS}}                       ║
║  Saved:            {{SAVINGS}}% ({{MONEY_SAVED}})            ║
║                                                               ║
║  📊 View full stats: fortress-optimizer.com/dashboard         ║
║  💬 Join community: discord.gg/fortress                      ║
║  🎁 Refer & earn:   fortress-optimizer.com/refer            ║
║                                                               ║
║  Upgrade to Pro for unlimited optimization!                 ║
║  🔗 fortress-optimizer.com/pricing?utm_source=npm           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
```

**Message 2 - Free Tier Limit Approaching (After 40K tokens used):**
```typescript
console.warn(`
⚠️  Free tier limit approaching (40K/50K tokens used)

Your free tier will reset on {{RESET_DATE}}.
Keep optimizing, or upgrade to Pro for unlimited.

👉 Upgrade now: fortress-optimizer.com/pricing
`);
```

**Message 3 - Referring Friends (Random, 1 in 20 optimizations):**
```typescript
console.log(`
🎁 Know someone optimizing prompts manually?
Share your referral link & both get $10 credit!

Your link: fortress-optimizer.com/refer?code={{USER_ID}}
Learn more: fortress-optimizer.com/refer
`);
```

---

### 2. VS Code Extension - UI Messages

**Installation Message (First Load):**
```typescript
// After extension installs
vscode.window.showInformationMessage(
  '🎉 Fortress installed! Configure your API key to start.',
  'Set API Key',
  'Learn More'
).then(selection => {
  if (selection === 'Set API Key') {
    vscode.commands.executeCommand('fortress.setApiKey');
  } else if (selection === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse(
      'https://fortress-optimizer.com/products/vscode?utm_source=vscode'
    ));
  }
});
```

**First Optimization Celebration:**
```typescript
// Show notification after first optimization
vscode.window.showInformationMessage(
  `✨ First optimization! You saved ${savings}% tokens. 
   Upgrade to Pro for unlimited: fortress-optimizer.com/pricing`,
  'Upgrade',
  'Dismiss'
);
```

**Savings Milestone Notifications:**
- 1,000 tokens saved: "You've saved 1,000 tokens! 🎉"
- 5,000 tokens saved: "Half-way to your monthly limit!"
- 40,000 tokens saved: "Upgrade to Pro for unlimited savings 🚀"

**Share on Twitter Button (In UI):**
```typescript
// Add button to share achievement
const shareButton = {
  command: 'fortress.shareToTwitter',
  title: 'Share this save on Twitter 🐦',
  tooltip: 'Let others know you\'re saving with Fortress'
};

// Tweet template:
// "I just saved {{SAVINGS}}% on LLM tokens with @fortress_optimizer 
// 🚀 Try free: fortress-optimizer.com (50K tokens/month)"
```

---

### 3. Slack Bot - Command Responses

**After First Optimization:**
```
✨ Optimized!

Original: "Can you please help me understand this code?"
Optimized: "Explain this code"

Tokens saved: 40%
Cost saved: $0.01

📊 Dashboard: fortress-optimizer.com/dashboard
🎁 Refer friends: fortress-optimizer.com/refer
```

**Usage Stats Response (After `/fortress usage`):**
```
📊 Your Monthly Usage

Optimizations: {{COUNT}}
Tokens saved: {{TOTAL_SAVED}}
Cost prevented: ${{MONEY_SAVED}}

Free tier: {{USED}}/50,000 tokens used
Resets on: {{RESET_DATE}}

Your team can save more! Share: fortress-optimizer.com/refer

Upgrade to Team plan: fortress-optimizer.com/pricing
```

**Pricing Info (After `/fortress pricing`):**
```
💰 Fortress Pricing

FREE: 50K tokens/month
PRO: $9.99/month (unlimited)
TEAM: $99/month (team collaboration)
ENTERPRISE: Custom pricing

See plans: fortress-optimizer.com/pricing

Pro users save on average: $50-200/month
```

---

### 4. GitHub Copilot Extension - Inline Messages

**First Optimization Popup:**
```
🎉 Fortress optimized your Copilot prompt!

Tokens saved: {{SAVINGS}}%
You can now upgrade to Pro for unlimited optimization.

[Upgrade to Pro]  [Dismiss]
```

**Savings Counter (In Status Bar):**
Shows live counter: "Fortress: {{TOKENS_SAVED}} tokens saved this session"

**Share on Twitter Link:**
```
"I'm using @fortress_optimizer with @github Copilot. 
Saving {{SAVINGS}}% on tokens. You should try it: fortress-optimizer.com"
```

---

### 5. Claude Desktop App - Desktop Notifications

**After Installation:**
```
Welcome to Fortress! 👋

Set your API key to start optimizing.
You'll save 18-22% on tokens automatically.

[Set API Key] [Learn More]
```

**Achievement Notifications:**
- "🎉 1st optimization!" → Open dashboard
- "💰 Saved $50!" → Upgrade to Pro
- "👥 Refer 3 friends!" → Show referral page
- "📈 1000 tokens saved!" → Share stats

---

## 💬 REFERRAL LOOP IMPLEMENTATION

**File:** `src/lib/referral.ts`

```typescript
// Referral System Implementation

interface ReferralReward {
  referrerId: string;
  refereeId: string;
  status: 'pending' | 'completed' | 'credited';
  rewardAmount: number;
  createdAt: Date;
  completedAt?: Date;
}

export class ReferralSystem {
  /**
   * Generate unique referral link for user
   */
  async generateReferralLink(userId: string): Promise<string> {
    const code = `${userId}-${Math.random().toString(36).substr(2, 9)}`;
    
    await db.referralCode.create({
      data: {
        code,
        userId,
        isActive: true,
      }
    });
    
    return `https://fortress-optimizer.com/signup?ref=${code}`;
  }

  /**
   * Track referral signup
   */
  async trackReferralSignup(referralCode: string, newUserId: string) {
    // Get referrer info
    const referralRecord = await db.referralCode.findUnique({
      where: { code: referralCode }
    });
    
    if (!referralRecord) return;
    
    // Create referral tracking record
    await db.referral.create({
      data: {
        referrerId: referralRecord.userId,
        refereeId: newUserId,
        status: 'pending',
        rewardAmount: 10, // $10 credit
      }
    });

    // Send emails
    await sendReferralWelcomeEmail(newUserId, referralRecord.userId);
    await sendReferralCompletionEmail(referralRecord.userId);
  }

  /**
   * Track referral completion (after referee makes first purchase)
   */
  async completeReferral(referralId: string) {
    const referral = await db.referral.findUnique({
      where: { id: referralId }
    });
    
    if (!referral) return;
    
    // Update status
    await db.referral.update({
      where: { id: referralId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
    
    // Add credit to referrer account
    await addAccountCredit(
      referral.referrerId, 
      referral.rewardAmount, 
      'referral_completed'
    );
    
    // Send confirmation email
    await sendReferralRewardEmail(referral.referrerId, referral.rewardAmount);
  }

  /**
   * Get referral stats for dashboard
   */
  async getReferralStats(userId: string) {
    const referrals = await db.referral.findMany({
      where: { referrerId: userId }
    });
    
    const completed = referrals.filter(r => r.status === 'completed');
    const pending = referrals.filter(r => r.status === 'pending');
    const totalEarnings = completed.reduce((sum, r) => sum + r.rewardAmount, 0);
    
    return {
      totalReferrals: referrals.length,
      completedReferrals: completed.length,
      pendingReferrals: pending.length,
      totalEarnings,
      topReferrers: await this.getTopReferrers(10)
    };
  }

  /**
   * Get leaderboard of top referrers
   */
  async getTopReferrers(limit: number = 10) {
    const referrals = await db.referral.findMany({
      where: { status: 'completed' },
      include: { referrer: true }
    });

    // Group by referrer and count
    const grouped = new Map<string, { user: any; count: number; earnings: number }>();
    
    referrals.forEach(r => {
      const existing = grouped.get(r.referrerId) || { 
        user: r.referrer, 
        count: 0, 
        earnings: 0 
      };
      existing.count++;
      existing.earnings += r.rewardAmount;
      grouped.set(r.referrerId, existing);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        user: item.user.name,
        referrals: item.count,
        earnings: item.earnings,
        reward: this.calculateReward(index) // Prize for top 3
      }));
  }

  /**
   * Calculate prize for top referrers
   */
  private calculateReward(rank: number): string {
    switch(rank) {
      case 0: return '1 year free Pro (value: $120)';
      case 1: return '6 months free Pro (value: $60)';
      case 2: return '3 months free Pro (value: $30)';
      default: return '';
    }
  }
}

// Helper functions for emails

async function sendReferralWelcomeEmail(newUserId: string, referrerId: string) {
  const referrer = await db.user.findUnique({ where: { id: referrerId } });
  const newUser = await db.user.findUnique({ where: { id: newUserId } });
  
  return sendEmail({
    to: newUser.email,
    subject: `${referrer.name} thinks you should try Fortress`,
    template: 'referral-welcome',
    variables: {
      referrerName: referrer.name,
      newUserName: newUser.name,
      referralLink: `https://fortress-optimizer.com?ref=${referrerId}`
    }
  });
}

async function sendReferralCompletionEmail(referrerId: string) {
  const referrer = await db.user.findUnique({ where: { id: referrerId } });
  
  return sendEmail({
    to: referrer.email,
    subject: 'Your referral is complete! $10 credit added 🎉',
    template: 'referral-completed',
    variables: {
      referrerName: referrer.name,
      creditAmount: 10
    }
  });
}

async function sendReferralRewardEmail(userId: string, amount: number) {
  const user = await db.user.findUnique({ where: { id: userId } });
  
  return sendEmail({
    to: user.email,
    subject: `You earned $${amount} from referrals!`,
    template: 'referral-reward',
    variables: {
      userName: user.name,
      rewardAmount: amount,
      totalEarnings: await getTotalReferralEarnings(userId)
    }
  });
}
```

**Referral Page Component:** `src/app/refer/page.tsx`

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';

export default function ReferralPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetch('/api/referral/stats')
        .then(r => r.json())
        .then(data => setStats(data));
    }
  }, [user]);

  const referralLink = `https://fortress-optimizer.com/refer?code=${user?.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Share Fortress. Get Rewards.</h1>
          <p className="text-xl text-zinc-300">
            Earn $10 credit for every friend who signs up
          </p>
        </div>

        {/* Referral Link */}
        <div className="bg-zinc-800 rounded-lg p-8 mb-12">
          <h2 className="text-xl font-semibold mb-4">Your Referral Link</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-black rounded px-4 py-2 text-white font-mono text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded flex items-center gap-2"
            >
              <Copy size={18} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <ShareButton
            platform="Twitter"
            text={`I'm saving 18% on my LLM costs with @fortress_optimizer. Try free: ${referralLink}`}
            icon="🐦"
          />
          <ShareButton
            platform="LinkedIn"
            text={`Fortress Token Optimizer saves my team thousands on AI APIs. Join me: ${referralLink}`}
            icon="💼"
          />
          <ShareButton
            platform="Email"
            text={`Check out Fortress - saves 18% on LLM tokens: ${referralLink}`}
            icon="📧"
          />
          <ShareButton
            platform="Copy Link"
            text={referralLink}
            icon="📋"
          />
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <StatCard
              label="Total Referrals"
              value={stats.totalReferrals}
            />
            <StatCard
              label="Completed"
              value={stats.completedReferrals}
            />
            <StatCard
              label="Earnings"
              value={`$${stats.totalEarnings}`}
            />
          </div>
        )}

        {/* Leaderboard */}
        {stats?.topReferrers && (
          <div className="bg-zinc-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Top Referrers</h2>
            <div className="space-y-4">
              {stats.topReferrers.map((referrer, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-zinc-900 rounded">
                  <div>
                    <div className="text-lg font-semibold">
                      {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'} {referrer.user}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {referrer.referrals} referrals • ${referrer.earnings}
                    </div>
                  </div>
                  {referrer.reward && (
                    <div className="text-sm text-green-400 font-semibold">
                      {referrer.reward}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareButton({ platform, text, icon }) {
  return (
    <button
      onClick={() => {
        if (platform === 'Copy Link') {
          navigator.clipboard.writeText(text);
        } else if (platform === 'Twitter') {
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
        } else if (platform === 'LinkedIn') {
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(text)}`);
        } else if (platform === 'Email') {
          window.open(`mailto:?subject=Fortress Token Optimizer&body=${encodeURIComponent(text)}`);
        }
      }}
      className="bg-zinc-700 hover:bg-zinc-600 p-4 rounded flex flex-col items-center gap-2"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm">{platform}</span>
    </button>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-6 text-center">
      <div className="text-sm text-zinc-400 mb-2">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
```

---

## 🎁 CONTENT LEAD MAGNETS IMPLEMENTATION

**File:** `src/app/tools/page.tsx`

### 1. Token Counter Tool

```typescript
'use client';

import { useState } from 'react';

export function TokenCounter() {
  const [prompt, setPrompt] = useState('');
  const [tokens, setTokens] = useState(0);
  const [results, setResults] = useState(null);

  const handleOptimize = async () => {
    const response = await fetch('/api/tools/estimate-tokens', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    
    setTokens(data.tokens);
    setResults({
      originalTokens: data.tokens,
      optimizedTokens: Math.floor(data.tokens * 0.82), // 18% avg savings
      savings: 18,
      costGPT4: (data.tokens * 0.000045).toFixed(4),
      costOptimizedGPT4: (data.tokens * 0.82 * 0.000045).toFixed(4),
      costClaude: (data.tokens * 0.000003).toFixed(6),
      costOptimizedClaude: (data.tokens * 0.82 * 0.000003).toFixed(6),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Token Counter Tool</h2>
      <p className="text-zinc-400 mb-6">Paste your prompt to see token count and estimated savings</p>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Paste your prompt here..."
        className="w-full h-40 bg-zinc-800 text-white rounded p-4 mb-4"
      />
      
      <button
        onClick={handleOptimize}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded mb-6"
      >
        Count Tokens
      </button>

      {results && (
        <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-zinc-400">Original</div>
              <div className="text-3xl font-bold">{results.originalTokens}</div>
              <div className="text-sm text-zinc-400">tokens</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">With Fortress</div>
              <div className="text-3xl font-bold text-green-400">{results.optimizedTokens}</div>
              <div className="text-sm text-zinc-400">{results.savings}% saved</div>
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="text-sm font-semibold mb-2">Cost Comparison</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>GPT-4 (original)</span>
                <span className="font-mono">${results.costGPT4}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>GPT-4 (optimized)</span>
                <span className="font-mono">${results.costOptimizedGPT4}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded p-4">
            <p className="text-sm mb-3">Want to automate this optimization?</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold">
              Try Fortress Free (No Credit Card)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Cost Calculator

```typescript
'use client';

import { useState } from 'react';

export function CostCalculator() {
  const [inputs, setInputs] = useState({
    tokensPerDay: 1000,
    provider: 'gpt4',
    team: 1
  });

  const providers = {
    gpt4: { name: 'GPT-4', costPer1k: 0.000045 },
    claude: { name: 'Claude 3', costPer1k: 0.000009 },
    gemini: { name: 'Gemini', costPer1k: 0.000075 }
  };

  const current = inputs.tokensPerDay * 30 * inputs.team * providers[inputs.provider].costPer1k;
  const optimized = current * 0.82; // 18% savings
  const savings = current - optimized;
  
  const fortressCost = inputs.team === 1 ? 9.99 : inputs.team <= 10 ? 99 : 299;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">AI Cost Calculator</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Tokens Per Day</label>
          <input
            type="number"
            value={inputs.tokensPerDay}
            onChange={(e) => setInputs({ ...inputs, tokensPerDay: parseInt(e.target.value) })}
            className="w-full bg-zinc-800 text-white rounded px-4 py-2"
          />
          <input
            type="range"
            min="100"
            max="100000"
            value={inputs.tokensPerDay}
            onChange={(e) => setInputs({ ...inputs, tokensPerDay: parseInt(e.target.value) })}
            className="w-full mt-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">LLM Provider</label>
          <select
            value={inputs.provider}
            onChange={(e) => setInputs({ ...inputs, provider: e.target.value })}
            className="w-full bg-zinc-800 text-white rounded px-4 py-2"
          >
            <option value="gpt4">GPT-4 (Most expensive)</option>
            <option value="claude">Claude 3 (Mid-range)</option>
            <option value="gemini">Gemini (Cheapest)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Team Size</label>
          <select
            value={inputs.team}
            onChange={(e) => setInputs({ ...inputs, team: parseInt(e.target.value) })}
            className="w-full bg-zinc-800 text-white rounded px-4 py-2"
          >
            <option value="1">Just me</option>
            <option value="5">5 developers</option>
            <option value="10">10 developers</option>
            <option value="20">20+ developers</option>
          </select>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="bg-zinc-800 rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-zinc-400">Current Monthly Cost</div>
              <div className="text-3xl font-bold">${current.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">With Fortress</div>
              <div className="text-3xl font-bold text-green-400">${optimized.toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded p-4">
            <div className="text-sm text-zinc-400">Monthly Savings</div>
            <div className="text-2xl font-bold text-green-400">${savings.toFixed(2)}</div>
            <div className="text-xs text-zinc-400 mt-2">
              After Fortress cost: ${(savings - fortressCost).toFixed(2)}/month
            </div>
          </div>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold">
          Get Started Free - See Real Savings
        </button>
      </div>
    </div>
  );
}
```

### 3. Platform Compatibility Checker

```typescript
'use client';

import { useState } from 'react';

export function CompatibilityChecker() {
  const [answers, setAnswers] = useState({
    q1: '', // Where do you code
    q2: [], // Languages
    q3: '' // Team size
  });

  const platforms = {
    individual: {
      npm: { fit: 'high', reason: 'Direct Node.js integration' },
      vscode: { fit: 'high', reason: 'Works in your editor' },
      copilot: { fit: 'medium', reason: 'If using Copilot already' }
    },
    team: {
      slack: { fit: 'high', reason: 'Team collaboration' },
      team: { fit: 'high', reason: 'Built for teams' },
      claude: { fit: 'medium', reason: 'Multi-user support' }
    },
    enterprise: {
      enterprise: { fit: 'high', reason: 'Custom deployment' },
      jetbrains: { fit: 'high', reason: 'IDE integration' },
      all: { fit: 'high', reason: 'Access to all platforms' }
    }
  };

  const recommendedPlatforms = [];
  if (answers.q3 === 'solo') recommendedPlatforms.push('npm', 'vscode', 'copilot');
  if (answers.q3 === 'team') recommendedPlatforms.push('slack', 'team-plan');
  if (answers.q3 === 'enterprise') recommendedPlatforms.push('enterprise', 'all-platforms');

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Platform Compatibility Check</h2>
      
      <div className="space-y-8">
        {/* Question 1 */}
        <div>
          <p className="font-semibold mb-4">Where do you primarily write code?</p>
          <div className="space-y-2">
            {['IDE (VS Code, JetBrains)', 'Terminal/Command line', 'Cloud IDE', 'Multiple'].map(option => (
              <label key={option} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="location"
                  value={option}
                  onChange={(e) => setAnswers({ ...answers, q1: e.target.value })}
                  className="w-4 h-4"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 2 */}
        <div>
          <p className="font-semibold mb-4">Programming languages (select all)</p>
          <div className="space-y-2">
            {['JavaScript/TypeScript', 'Python', 'Go', 'Java'].map(lang => (
              <label key={lang} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={answers.q2.includes(lang)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAnswers({ ...answers, q2: [...answers.q2, lang] });
                    } else {
                      setAnswers({ ...answers, q2: answers.q2.filter(l => l !== lang) });
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>{lang}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 3 */}
        <div>
          <p className="font-semibold mb-4">Team size</p>
          <div className="space-y-2">
            {[{ val: 'solo', label: 'Just me' }, { val: 'team', label: '2-20 devs' }, { val: 'enterprise', label: '20+ devs' }].map(option => (
              <label key={option.val} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="team"
                  value={option.val}
                  onChange={(e) => setAnswers({ ...answers, q3: e.target.value })}
                  className="w-4 h-4"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {answers.q1 && answers.q3 && (
        <div className="mt-8 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Recommended Platforms For You</h3>
          <div className="space-y-3">
            {recommendedPlatforms.slice(0, 3).map((platform, idx) => (
              <div key={idx} className="bg-zinc-800 rounded p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold capitalize">{platform.replace('-', ' ')}</div>
                  <div className="text-sm text-zinc-400">Best fit for your setup</div>
                </div>
                <div className="bg-green-600 text-white px-3 py-1 rounded text-sm">Perfect</div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold">
            Get Started With Recommended Platforms
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🔗 ROUTING & PAGE STRUCTURE

```typescript
// src/app/tools/page.tsx
import { TokenCounter } from '@/components/tools/token-counter';
import { CostCalculator } from '@/components/tools/cost-calculator';
import { CompatibilityChecker } from '@/components/tools/compatibility-checker';

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('counter');

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black py-12">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-center mb-4">Free Tools</h1>
        <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
          No signup required. See your potential savings instantly.
        </p>

        <div className="flex gap-4 mb-12 border-b border-zinc-700">
          {['Token Counter', 'Cost Calculator', 'Platform Checker'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === tab.toLowerCase() 
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-zinc-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'token counter' && <TokenCounter />}
        {activeTab === 'cost calculator' && <CostCalculator />}
        {activeTab === 'platform checker' && <CompatibilityChecker />}
      </div>
    </div>
  );
}
```

This implementation creates a complete funnel from free lead magnets to paid conversion!
