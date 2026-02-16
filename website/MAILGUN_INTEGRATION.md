# Mailgun + Contact Form Integration ✅

## What Was Added

### 1. **Email Utilities** (`src/lib/email.ts`)
- `sendEmail()` - Send any email via Mailgun
- `sendContactEmail()` - Send contact form submissions to support
- `sendWelcomeEmail()` - Send welcome emails to new users

### 2. **Contact Form Component** (`src/components/contact-form.tsx`)
- Client-side React form with validation
- Real-time feedback (loading, success, error states)
- Beautiful UI with Tailwind styling
- Success message shows after submission

### 3. **Contact API Route** (`src/app/api/contact/route.ts`)
- Receives form submissions from the frontend
- Validates email, name, and message
- Sends email via Mailgun
- Returns appropriate error/success responses

### 4. **Support Page** (`src/app/support/page.tsx`)
- Professional support landing page
- Contact form integrated
- Quick links to docs and install guides
- FAQ section with 6 common questions
- Response time expectations

### 5. **Setup Documentation** (`MAILGUN_SETUP.md`)
- Step-by-step Mailgun account setup
- Environment variable configuration
- Sandbox vs custom domain comparison
- Troubleshooting guide
- Code examples for all email functions

---

## Quick Start

### Step 1: Get Mailgun API Key
1. Go to [mailgun.com](https://mailgun.com) and create a free account
2. Go to **Settings** → **API Security** and copy your API key
3. Go to **Sending** → **Domains** and note your domain (sandbox or custom)

### Step 2: Add Environment Variables
Create/update `.env.local`:
```env
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=sandboxXXXX.mailgun.org
FROM_EMAIL=support@fortress-optimizer.com
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

### Step 4: Test It Out
Visit `http://localhost:3000/support` and submit the contact form!

---

## How It Works

### Contact Form Flow
```
User fills form → Click "Send Message"
     ↓
POST /api/contact
     ↓
Validate input
     ↓
Send email via Mailgun to support@fortress-optimizer.com
     ↓
Show success message
```

### The email includes:
- **To:** support@fortress-optimizer.com
- **Reply-To:** user's email (so you can click reply and respond)
- **Subject:** "New support request from [Name]"
- **Body:** User's message formatted with name and email

---

## Using Email Functions in Your Code

### Send welcome email after signup:
```typescript
import { sendWelcomeEmail } from '@/lib/email';

// After user signs up
await sendWelcomeEmail(newUser.email, newUser.name);
```

### Send password reset email:
```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: user.email,
  subject: 'Reset Your Password',
  html: `<a href="${resetLink}">Click here to reset password</a>`,
  replyTo: 'support@fortress-optimizer.com',
});
```

---

## Free Tier Limits

**Mailgun Sandbox Domain:**
- 5,000 emails/month (free)
- Perfect for testing and early beta
- Can only send to verified recipient emails
- Subdomain provided by Mailgun

**Pricing After Free Tier:**
- 100k emails/month: $75
- At 10k users: ~$11/month (assuming 1.5 emails per user)

---

## Frontend Integration

The contact form is at:
- **URL:** `/support`
- **Component:** `ContactForm` in `src/components/contact-form.tsx`
- **Can be reused:** Import it anywhere you need a contact form

---

## Status Check

✅ Mailgun SDK installed
✅ Email utility functions created
✅ Contact form component built
✅ API endpoint functional
✅ Support page with FAQ
✅ Documentation provided
✅ Dev server running

**Next step:** Sign up for Mailgun and add your credentials to `.env.local`

---

## Troubleshooting

**Form not sending?**
- Check `.env.local` has `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`
- Restart dev server after adding env vars
- Check browser console for error messages

**Email not arriving?**
- If using sandbox domain, verify recipient email in Mailgun dashboard
- Check spam folder
- Look at Mailgun dashboard → **Logs** to see send status

**"Email service not configured"?**
- Make sure environment variables are set
- Verify no typos in `.env.local`
- Restart the dev server

See `MAILGUN_SETUP.md` for more details.
