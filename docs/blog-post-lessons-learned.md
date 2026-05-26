---
title: My SaaS Was Silently Down For 30 Days. Here's What I Missed.
published: false
tags: postmortem, vercel, stripe, devops
---

I run a small SaaS — an API that optimizes LLM prompts to reduce token costs. Last week I ran a top-to-bottom live walkthrough of the production system: real signup, real checkout, real security probes. Routine, I thought. Spot-check the obvious stuff.

The walkthrough caught seven distinct issues. Three of them had been live for over a month. Two had been silently breaking every paid-customer attempt since the day I deployed Stripe. I would have lost real revenue if anyone had actually tried to buy.

This is the writeup I wish I'd read six months ago.

## #1: `vercel.json` was overriding my Vercel dashboard env vars

The symptom: every Stripe call returned `Invalid API Key provided: Stripese***********sing`. Stripe masks the middle of the key for security, showing only the first 8 and last 4 chars. So the key being sent was 35 characters starting with `Stripese` and ending with `sing`.

That's not a Stripe key. That's the literal string `"Stripe secret key for payment processing"`.

The cause was this block in `vercel.json`:

```json
{
  "env": {
    "STRIPE_SECRET_KEY": "Stripe secret key for payment processing",
    "DATABASE_URL": "PostgreSQL database connection string",
    "STRIPE_WEBHOOK_SECRET": "Stripe webhook secret for payment events"
  }
}
```

I'd written that months ago, intending those values as *placeholders*. Documentation for myself. "Here's what should go here."

Vercel doesn't treat them as documentation. The `env` block in `vercel.json` is literal env var assignment that runs AT DEPLOY TIME and overrides anything you set in the dashboard. I had been rotating the dashboard value carefully through every credential rotation, every breach response, every Stripe upgrade. None of it mattered. The runtime was getting the description string.

**Fix:** delete the `env` block from `vercel.json`. Set env vars only via the dashboard (or `vercel env add`).

**Lesson:** never use config file env sections for documentation. They aren't comments.

## #2: `echo "value" | vercel env add` adds a trailing newline

After fixing #1, Stripe calls started returning a *different* error: `An error occurred with our connection to Stripe. Request was retried 2 times.`

That's `StripeConnectionError` — usually network. But the same Stripe API responded fine to direct curl calls from my laptop with the same key. So it wasn't network. It wasn't the key. What was it?

I deployed a temporary debug endpoint:

```ts
// DELETE THIS AFTER DIAGNOSIS
export async function GET() {
  return NextResponse.json({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? {
      length: process.env.STRIPE_SECRET_KEY.length,
      prefix: process.env.STRIPE_SECRET_KEY.slice(0, 12),
      suffix: process.env.STRIPE_SECRET_KEY.slice(-4),
    } : 'UNSET',
  });
}
```

Result:

```json
{
  "STRIPE_SECRET_KEY": {
    "length": 108,
    "prefix": "sk_live_51T2",
    "suffix": "MXU\n"
  }
}
```

`length: 108`. Real `sk_live_` keys are 107 characters. And the suffix ended in `\n`.

I'd set the env var with:

```bash
echo "sk_live_51T2..." | vercel env add STRIPE_SECRET_KEY production
```

`echo` adds a trailing newline by default. Vercel CLI captured stdin verbatim. Six different env vars had `\n` baked in.

Stripe's HTTP client rejects keys with trailing whitespace, but it doesn't surface it as `StripeAuthenticationError`. It surfaces it as a `StripeConnectionError` because the malformed key gets dropped in the connection layer before auth even runs. The retry-loop message made it look like a network issue.

**Fix:** use `printf "value"` (no trailing newline) instead of `echo "value"`.

```bash
# Wrong — adds \n
echo "$KEY" | vercel env add STRIPE_SECRET_KEY production

# Right
printf "%s" "$KEY" | vercel env add STRIPE_SECRET_KEY production
```

**Lesson:** invisible characters cause visible bugs. Any time you pipe stdin to a tool that stores secrets, check the length of what got stored.

## #3: Builds had been failing silently for 12 days

My deploy workflow runs on every push to main. Vercel build succeeds → automatic production deploy. Standard CI.

It had been failing for 12 days. I didn't notice.

The cause: I'd added two new models (`Account`, `Session`) to my Prisma schema for OAuth user storage. Edited application code to use `prisma.account.create(...)`. Committed the code change. Pushed.

I never staged the `prisma/schema.prisma` change. The application code referenced `prisma.account` but the committed schema didn't have an `Account` model. Local builds worked because `prisma generate` ran against my locally-modified schema. CI ran against the committed schema, where Account didn't exist, so TypeScript errored:

```
Type error: Property 'account' does not exist on type 'PrismaClient'.
```

Every deploy after that commit failed. Vercel kept the last successful build live. My website kept serving stale code. I kept rotating credentials in the dashboard thinking the *current* deploy would pick them up. It didn't. It was the old deploy from 12 days ago, which had the broken `vercel.json` env block (see #1).

**Fix:** `git status` more aggressively after multi-file refactors. Set up GitHub Action notifications so failed deploys actually alert you.

**Lesson:** "deployed" and "deployed successfully" are different things. Watch deploy outcomes, not just push outcomes.

## What else I caught

The walkthrough caught more, briefly:

- **ECS task definition had stale RDS password.** During a credential rotation, I updated the Vercel-side `DATABASE_URL` but forgot the ECS task definition. The Python backend had been crash-looping for 30 days with `password authentication failed for user "postgres"`. Anyone using the Python SDK got 503s.
- **Stripe webhook URL mismatch.** The webhook was registered at `/api/webhooks/stripe` (plural). My Next.js route was at `/api/webhook/stripe` (singular). Every payment event returned 404. Renamed the directory.
- **ALB HTTPS:443 default action routed to a stopped EC2 instance** from a year ago. Anyone hitting `https://api.fortress-optimizer.com/` without a path prefix got a 502.
- **Email validation accepted `x'OR'1'='1@test.com`.** Prisma protects against SQL injection at the query layer, but storing values that *look* like injection payloads is bad hygiene.
- **XSS payload `<script>alert(1)</script>` was accepted as a "name"** during signup. React escapes on render, so impact was minimal — but defense-in-depth means rejecting it server-side.

## The diagnostic tool that actually mattered

After spending an hour staring at `Invalid API Key: Stripese***********sing`, the thing that finally cracked it was that one debug endpoint that returned env var lengths and prefixes/suffixes.

Five minutes of code, deployed and deleted in the same session. It told me:

```
STRIPE_SECRET_KEY: len=108, prefix="sk_live_51T2", suffix="MXU\n"
```

And the bug was suddenly obvious.

**Lesson:** when production has a confusing error, build the smallest possible introspection endpoint. Don't ship it long-term. Don't ship secrets — only lengths and shape. Five minutes to write, ten seconds to fix what it reveals.

## The actual takeaway

I had 583 backend tests in CI. Type-checking on PRs. Auto-deploy on green builds. Security tests on every deploy. The works.

None of it caught any of these bugs.

Each test verified the *thing it was designed to verify*. The Stripe tests checked happy paths against a sandbox. The auth tests verified password validation. The ECS task tests verified the task definition existed. No test verified that the production system, end-to-end, with the real env vars, real Stripe keys, real DB, actually worked.

That kind of testing has a name: live walkthrough. It's just doing what your customers do: sign up, log in, hit checkout, use the API. From outside.

Do one. Find a quiet hour, point curl at production, walk every flow your users walk. If it works, great. If it doesn't, you just dodged the bullet you didn't know was coming.

I'd love to hear your worst silent-failure story. Or what you do to catch this stuff. Or both.

---

*Project I'm building: [Fortress Token Optimizer](https://fortress-optimizer.com) — API that compresses LLM prompts to cut token costs 10-20%. Open to feedback if you run high-volume LLM workloads.*
