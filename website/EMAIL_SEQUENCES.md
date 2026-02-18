# 📧 Email Sequences - Complete Marketing Automation

## 🎯 WELCOME SEQUENCE (All Channels)

### Email 1: Welcome - Day 0 (Immediate)
**Subject:** 🚀 Welcome! Your first 50,000 tokens are ready
**Goal:** Get them to their first optimization
**Send:** Right after signup (real-time)

```html
Hi {{FIRST_NAME}},

Welcome to Fortress! 🎉

You just joined {{TOTAL_USERS}} developers saving 18-22% on LLM costs.
And you're about to save your first tokens.

Here's your getting started path (pick one - takes 5 minutes):

═══════════════════════════════════════════════════════════════

🚀 FASTEST: Try Our Demo First
Visit: {{BASE_URL}}/dashboard

See real-time optimization in action. No setup required.
Paste any prompt → see tokens saved instantly.

═══════════════════════════════════════════════════════════════

📦 npm Developer?
1. npm install @fortress-optimizer/core
2. Get API key: {{BASE_URL}}/api-keys
3. Paste into your code:

const { FortressOptimizer } = require('@fortress-optimizer/core');
const optimizer = new FortressOptimizer('{{API_KEY}}');
const result = await optimizer.optimize('Your prompt');

═══════════════════════════════════════════════════════════════

⚙️ VS Code User?
1. Install extension: "Fortress Token Optimizer"
   (Search in Marketplace)
2. Add your API key in Settings
3. Use: Cmd+K, Cmd+I to optimize any prompt

═══════════════════════════════════════════════════════════════

💬 Slack Team?
1. Add to Slack: {{SLACK_INSTALL_URL}}
2. Get API key: {{BASE_URL}}/api-keys
3. Use: @fortress optimize "your prompt"

═══════════════════════════════════════════════════════════════

📊 Your Numbers Right Now:
✓ API Key: Active
✓ Free tier: 50,000 tokens/month (~$50 value)
✓ Account status: Ready to optimize

Not sure which path? Check this out:
[Platform Compatibility Check] {{BASE_URL}}/tools/compatibility

Questions? Reply to this email. I'm here to help.

Happy optimizing,
{{SENDER_NAME}}
Fortress Team

P.S. First optimization is always the hardest. After that, you'll wonder how you lived without Fortress.
```

---

### Email 2: First Optimization - Day 1
**Subject:** [Name], you just saved {{SAVINGS}}% of tokens! 🎉
**Goal:** Celebrate their first win + show the dashboard
**Send:** When they first optimize (trigger-based)

```html
{{FIRST_NAME}},

YES! Your first optimization just happened! 🚀

Here's what happened:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Prompt:
"Can you please help me refactor this React component so that it is much 
more performant and faster..."

Optimized:
"Refactor React component for performance: memoization, lazy loading, code splitting."

Tokens Saved: {{SAVINGS}}%
Estimated $ Saved: {{MONEY_SAVED}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

That's just the beginning. Multiply this by:
- Your daily prompts: {{DAILY_ESTIMATE}}
- Your monthly projects: {{MONTHLY_ESTIMATE}}
- Your team's codebase: {{TEAM_POTENTIAL}}

Your Fortress dashboard has been tracking everything:
[View Full Dashboard] {{BASE_URL}}/dashboard

Next step? Share this with your team. They can all benefit.
Or upgrade to Pro for unlimited optimization.

[Upgrade to Pro] {{PRICING_URL}}

What do you want to optimize next?

- {{SENDER_NAME}}
Fortress Team

P.S. Pro members tell us this saves them $40-200/month depending on API usage.
```

---

### Email 3: Case Study - Day 3
**Subject:** How {{COMPANY}} saved $50K/month with Fortress
**Goal:** Social proof + FOMO
**Send:** Day 3, if not upgraded yet

```html
{{FIRST_NAME}},

Quick story from one of our customers:

Engineering Team at {{EXAMPLE_COMPANY}}:
- 50 engineers
- Using GPT-4 heavily
- Monthly LLM budget: $75,000

They integrated Fortress across:
✓ npm packages (backend optimization)
✓ VS Code (prompt writing optimization)
✓ GitHub Copilot (automatic optimization)

Results after 30 days:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Previous monthly spend: $75,000
New monthly spend: $25,000
Monthly savings: $50,000
Annual savings: $600,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The best part? No code changes. No workflow changes.
Just installed Fortress and watched the bills drop.

"Fortress just works. We didn't have to teach anyone anything.
Optimization happens automatically."
— CTO, {{EXAMPLE_COMPANY}}

For a team your size ({{TEAM_SIZE}}), that could mean:
${{POTENTIAL_SAVINGS}}/month in savings

[See Your Potential] {{BASE_URL}}/tools/cost-calculator
[Upgrade to Team Plan] {{PRICING_URL}}

Still thinking about it?
[Schedule 15-min Demo] {{CALENDAR_URL}}

—{{SENDER_NAME}}
```

---

### Email 4: Upgrade Offer - Day 7
**Subject:** {{FIRST_NAME}}, unlock unlimited optimization (expires in 48h)
**Goal:** Convert to paid
**Send:** Day 7, if free tier only

```html
{{FIRST_NAME}},

You've been optimizing for a week. Here's what you've accomplished:

📊 Your Week in Numbers:
✓ {{TOTAL_OPTIMIZATIONS}} optimizations completed
✓ {{TOTAL_SAVINGS}} tokens saved
✓ ${{MONEY_SAVED}} in prevented API costs
✓ {{LLM_PROVIDERS}} different LLM providers used

That's {{DAILY_AVERAGE}} optimizations per day.
With your current usage, you'll hit your 50K free monthly limit in:
→ {{DAYS_REMAINING}} days

Here's what Pro users are doing differently:

Free Tier (You right now):
- 50,000 tokens/month (~$50 value)
- Basic optimization
- Community support

Pro Tier ($9.99/month):
✓ Unlimited token optimization (~$500+ value)
✓ Advanced analytics dashboard
✓ Multi-provider support
✓ Team collaboration
✓ Priority support
✓ Early access to new features

Quick math:
If you're saving an average of {{SAVINGS_PER_PROMPT}}% per optimization,
and running {{MONTHLY_PROMPTS}} prompts/month...

Monthly savings with Fortress: ${{MONTHLY_LLM_SAVINGS}}
Cost of Pro: $9.99
Net benefit: ${{NET_BENEFIT}}/month

That's a {{ROI}}x return on investment.

[Upgrade to Pro - $9.99/month] {{UPGRADE_URL}}

Not ready? No pressure. Your free tier is waiting.
But {{DAYS_REMAINING}} days goes fast.

Questions? Hit reply.

—{{SENDER_NAME}}
Fortress Team

P.S. First month is guaranteed. Cancel anytime. No hidden fees.
```

---

## 🎯 CHANNEL-SPECIFIC SEQUENCES

### Product Hunt Launch Sequence
**Sequence:** 3 emails over 5 days

**Email 1 (Launch Day):** 
Subject: "Fortress just launched on Product Hunt 🚀"
```
Hey {{FIRST_NAME}},

We just went live on Product Hunt!

We'd love your support:
[Upvote on Product Hunt] {{PH_URL}}

Every upvote helps us reach more developers who want to save on AI costs.

Plus: Early backers get exclusive perks:
🎁 1 year free Pro (for first 100 upvoters)

Thanks for being part of this journey.

—The Fortress Team
```

**Email 2 (Day 2):**
Subject: "Fortress is #3 on Product Hunt today 📈"
```
{{FIRST_NAME}},

Amazing momentum! We're trending high on Product Hunt.

Real stories from today:
"This just saved me $200 on my API bill" — Dev from SF
"Finally, automatic optimization" — Engineering Manager
"Works with everything I use" — Solo developer

[See what people are saying] {{PH_COMMENTS_URL}}

Still upvote-friendly:
[Keep the momentum going] {{PH_URL}}

—The Fortress Team
```

**Email 3 (Day 3):**
Subject: "Fortress is #1 Product of the Day! 🏆"
```
{{FIRST_NAME}},

WE DID IT! Fortress is #1 on Product Hunt today!

Thank you. This wouldn't happen without developers like you.

Special thank you gift:
Everyone who upvoted gets 3 months of Pro free (if you upgrade today).

[Claim Your 3 Free Months] {{CLAIM_URL}}

Celebrate with us:
[Join our Discord community] {{DISCORD_URL}}

—The Fortress Team
```

---

### Organic Search Sequence (From Blog)
**Trigger:** Came from blog post about token optimization

**Email 1:**
Subject: {{FIRST_NAME}}, here's what I didn't fit in the article
```
Hey {{FIRST_NAME}},

You just read my article "How to Reduce LLM Token Costs by 20%".

The feedback I got: "Show me real numbers."

So here's what {{EXAMPLE_COMPANY}} did (real numbers):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before: $3,000/month on GPT-4
After: $2,400/month (20% reduction)
Savings: $600/month = $7,200/year

They used Fortress.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What did they do? Same things I mentioned in the article.
But automated. With Fortress.

Try it yourself:
[Free token counter] {{BASE_URL}}/tools/token-counter

See exactly how many tokens you could save.

—{{SENDER_NAME}}
```

---

### Referral Sequence
**Trigger:** User clicks referral link

**Email 1:**
Subject: "{{REFERRER}} thinks you should try Fortress"
```
Hi {{NEW_USER}},

{{REFERRER}} just shared Fortress with you.

Why? Because they're saving {{REFERRER_SAVINGS}}% on their LLM costs.

Quick intro:
Fortress automatically optimizes your AI prompts across:
✓ npm (Node.js)
✓ VS Code
✓ Slack
✓ GitHub Copilot
✓ And 7 more tools

Average savings: 18-22% on LLM costs.
Average first month saving: $50-200.

Both you and {{REFERRER}} get:
🎁 $10 credit each (no minimum spend required)

[Get Started Free] {{SIGNUP_URL}}

No credit card. 50,000 free tokens to start.

—The Fortress Team

P.S. {{REFERRER}} is cool for sharing this with you. Give them a thanks! 😊
```

---

## 💬 ABANDONED SIGNUP SEQUENCE

**Trigger:** Started signup but didn't complete

**Email 1 (4 hours later):**
Subject: "Did you get stuck? We can help"
```
Hey there,

We noticed you started signing up for Fortress but didn't quite finish.

If you hit a snag:
→ [Try again] {{SIGNUP_URL}}
→ [Common issues] {{HELP_URL}}
→ [Email me directly] {{SUPPORT_EMAIL}}

Or maybe you're just not sure if Fortress is for you?

Ask yourself:
✓ Do you use LLMs (ChatGPT, Claude, Gemini)?
✓ Do you write in code or use command line?
✓ Do you want to save on API costs?

If yes to all 3, Fortress is your answer.

[Get Started Free] {{SIGNUP_URL}}

No pressure, but seriously—it takes 90 seconds.

—{{SENDER_NAME}}
```

**Email 2 (24 hours later):**
Subject: "The $50 you didn't claim (expires tomorrow)"
```
{{FIRST_NAME}},

Quick reminder: You left {{AMOUNT}} on the table.

When you sign up for Fortress:
✓ 50,000 free tokens (worth ~$50 in API calls)
✓ Take 2 minutes to add your API key
✓ See instant savings

[Complete Your Signup] {{SIGNUP_URL}}

That's it. No credit card. Literally takes 90 seconds.

Let's save you some money.

—{{SENDER_NAME}}
```

---

## 🎁 LOYALTY SEQUENCE (Monthly)

**Email 1: Monthly Stats**
Subject: "Here's your {{MONTH}} Fortress summary 📊"
```
{{FIRST_NAME}},

Your Fortress stats for {{MONTH}}:

═══════════════════════════════════════════════════════════════
Optimizations completed: {{COUNT}}
Tokens saved: {{TOKENS}}
API cost prevented: ${{SAVINGS}}
Projects using Fortress: {{PROJECTS}}
═══════════════════════════════════════════════════════════════

If you were paying full price on every token:
- Your bill would be: ${{FULL_BILL}}
- With Fortress: ${{OPTIMIZED_BILL}}
- You saved: ${{MONEY_SAVED}}

Ranked: You're in the top {{PERCENTILE}}% of Fortress users!

Next month predictions:
Based on your usage, you'll likely save ${{NEXT_MONTH_ESTIMATE}}.

[Upgrade to Pro to track more] {{UPGRADE_URL}}

Thanks for using Fortress.

—{{SENDER_NAME}}
```

---

## ⚠️ CHURN PREVENTION SEQUENCE

**Trigger:** User hasn't optimized in 14 days

**Email 1:**
Subject: "We miss you! Get back to saving {{FIRST_NAME}}"
```
{{FIRST_NAME}},

It's been a while since you've used Fortress.

Here's what you might be missing:
✓ Last month: {{LAST_MONTH_USERS}} developers saved money with Fortress
✓ New feature: {{NEW_FEATURE_NAME}}
✓ Your potential: ${{POTENTIAL_MONTHLY}}

Quick question: What would make Fortress more useful?
→ [Answer 2 quick questions] {{FEEDBACK_URL}}

[Get back to saving] {{DASHBOARD_URL}}

—{{SENDER_NAME}}
```

---

## 📊 EMAIL PERFORMANCE TARGETS

| Sequence | Expected Open Rate | Click Rate | Conversion |
|----------|-----------------|-----------|-----------|
| Welcome | 75%+ | 35%+ | 40%+ signup completion |
| First Optimization | 85%+ | 45%+ | 25%+ upgrade |
| Case Study | 60%+ | 25%+ | 12%+ upgrade |
| Upgrade Offer | 70%+ | 40%+ | 18%+ upgrade |
| PH Launch | 80%+ | 50%+ | 30%+ upvotes |
| Referral | 65%+ | 35%+ | 50%+ conversion |
| Churn Prevention | 55%+ | 20%+ | 15%+ re-engagement |

---

## 🎯 SEND TIME OPTIMIZATION

**Weekday preferences:**
- Mon-Thu: 9 AM (work start)
- Tue-Wed: 2 PM (afternoon focus time)
- Thu: 10 AM (end of week push)
- Fri: Not recommended (low engagement)

**Time zones:**
Send in recipient's local morning (6-9 AM)

**Test sending:**
- 50% at 9 AM
- 30% at 2 PM
- 20% at 11 AM
Pick winner for future sends
