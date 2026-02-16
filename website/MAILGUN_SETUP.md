# Mailgun Setup Guide

## Environment Variables Required

Add these to your `.env.local` file:

```env
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=mg.fortress-optimizer.com
FROM_EMAIL=support@fortress-optimizer.com
```

## Step-by-Step Setup

### 1. Create a Mailgun Account

1. Go to [mailgun.com](https://mailgun.com)
2. Sign up for a free account
3. Verify your email

### 2. Get Your API Key

1. Log in to Mailgun dashboard
2. Go to **Settings** → **API Security**
3. Copy your **API Key** (looks like: `key-xxxxxxxxxxxxxxxxxxxxxxxx`)

### 3. Set Up Your Domain

#### Option A: Use Mailgun's Free Subdomain (Easiest)

1. In the dashboard, go to **Sending** → **Domains**
2. Click **Add Domain**
3. Choose **Mailgun Sandbox** (free, for testing)
4. You'll get a domain like: `sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org`
5. Use this in `MAILGUN_DOMAIN=sandboxXXXX.mailgun.org`

#### Option B: Use Your Custom Domain (For Production)

1. In the dashboard, go to **Sending** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `mg.fortress-optimizer.com`)
4. Follow DNS verification steps
5. Once verified, use it in `MAILGUN_DOMAIN=mg.fortress-optimizer.com`

### 4. Add Environment Variables

Create/update `.env.local`:

```env
MAILGUN_API_KEY=key-abc123def456...
MAILGUN_DOMAIN=sandboxXXXX.mailgun.org
FROM_EMAIL=support@fortress-optimizer.com
```

### 5. Test the Integration

You can test the contact form at: `http://localhost:3000/support`

## Important Notes

**Sandbox Domain Limitations:**
- Free tier: 5,000 emails/month
- Can only send to **verified recipients** (add email in dashboard)
- Perfect for testing and early beta

**Custom Domain Benefits:**
- Full email volume
- Professional domain appearance
- Better deliverability for production

**Cost:**
- Free: 5,000 emails/month
- 10k emails/month: ~$7.50
- 100k emails/month: $75
- Custom pricing for higher volumes

## Email Functions Available

### Send Custom Email

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>This is an email</p>',
  replyTo: 'support@fortress-optimizer.com',
});
```

### Send Contact Form Email

```typescript
import { sendContactEmail } from '@/lib/email';

await sendContactEmail(
  'user@example.com',
  'John Doe',
  'I have a question about your product'
);
```

### Send Welcome Email

```typescript
import { sendWelcomeEmail } from '@/lib/email';

await sendWelcomeEmail('newuser@example.com', 'Jane Smith');
```

## Troubleshooting

**"Email service not configured"**
- Check that `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are set in `.env.local`
- Restart your dev server after adding env vars

**"Email sent successfully but not received"**
- Check spam folder
- If using sandbox domain, verify the recipient email in Mailgun dashboard
- Switch from sandbox domain to custom domain for production

**"Invalid domain"**
- Make sure domain is verified in Mailgun dashboard
- Allow ~15 minutes for DNS propagation if using custom domain

## Next Steps

1. ✅ Create Mailgun account
2. ✅ Add API key to `.env.local`
3. ✅ Test contact form at `/support`
4. ✅ Set up custom domain when ready for production
5. ✅ Add authenticated email verification endpoint (optional)
