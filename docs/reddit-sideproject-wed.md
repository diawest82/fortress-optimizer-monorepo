## r/SideProject — Wednesday (post 12-24h after Show HN)

**Title:**
```
Show HN went live yesterday — here's what 30 days of "production" downtime taught me about over-engineering
```

**Body:**

```
I launched my side project on Show HN yesterday: https://news.ycombinator.com/item?id=YOURPOSTID

The product is a prompt-optimization API (cuts LLM token costs ~11-22% by stripping filler before the model sees it). But I'm not posting here to pitch — I want to share what running a "real" live walkthrough exposed about my own production setup, because I bet other indie founders have similar landmines they haven't tripped yet.

Stack: Next.js on Vercel, FastAPI on AWS ECS, Postgres on RDS, Stripe live, 583 backend tests in CI.

Three findings that made me question my own competence:

**1. vercel.json had description strings as env values**

Someone (probably me, months ago) wrote this in vercel.json:

    "env": {
      "STRIPE_SECRET_KEY": "Stripe secret key for payment processing",
      ...
    }

Those weren't placeholders for the dashboard — Vercel takes the `env` block in vercel.json LITERALLY and uses those strings as the actual env values at runtime. Every Stripe call had been returning "Invalid API Key: Stripese***********sing" for months because the runtime literally had "Stripe secret key for payment processing" as the API key.

I lost ~30 days of would-be conversions to this. The fix was deleting the `env` block from vercel.json.

**2. `echo "value" | vercel env add` adds a trailing newline**

When you pipe a value to Vercel's CLI, echo's trailing `\n` gets captured into the stored value. Six env vars had `\n` baked in.

The kicker: Stripe rejects keys with trailing whitespace as a *connection error* ("Request was retried 2 times") not an auth error. So I was chasing network issues that were really a single invisible character.

Fix: use `printf "value"` instead of `echo "value"`.

**3. Prisma schema changes uncommitted for 12 days**

I added Account/Session models to schema.prisma for OAuth, edited application code to use them, committed the code, pushed. Builds failed in CI for 12 days because the schema file change was never staged — TypeScript couldn't find `prisma.account` since the generated client in CI didn't have it.

Local builds worked perfectly because `prisma generate` ran against the local-modified schema. CI ran against the committed schema.

Lesson: `git status` more often, especially after multi-file changes.

**Other things the walkthrough caught:**
- Stripe webhook URL mismatch (`/api/webhook/` singular vs `/api/webhooks/` plural)
- ECS task definition still had old RDS password from before a credential rotation — backend was down for ~30 days
- ALB HTTPS:443 default action routed to a stopped EC2 instance
- XSS in name field accepted unsanitized
- Email validation regex accepted SQL-injection-looking values

The walkthrough was just curl + a debug endpoint that returned `env.STRIPE_SECRET_KEY.slice(0,12) + ' ... ' + env.STRIPE_SECRET_KEY.slice(-4)`. That one endpoint, deployed for 5 minutes, exposed three latent bugs.

If you're running a SaaS that "works fine" and haven't done a top-to-bottom live test recently, do it. Mine had been "fine" for a month while every paid customer attempt would have silently 500'd.

Project link if anyone wants to poke at it (don't worry about karma points): https://fortress-optimizer.com

What's the worst silent-failure you've found in your own production?
```

**Why this works for r/SideProject:**
- Title leads with a story, not a product
- Body is 80% war stories, 20% project mention
- Asks an engagement question at the end (algo-friendly)
- Linking to the HN thread (third-party) avoids the anti-promo auto-mod
- Founders love debugging horror stories
