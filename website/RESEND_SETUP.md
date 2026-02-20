# Resend Setup Guide

## What is Resend?

Resend is an email API built for developers. Perfect for transactional emails like welcome messages, password resets, and support notifications.

## Environment Variables Required

Add this to your `.env.local` file:

```env
RESEND_API_KEY=re_YOUR_API_KEY_HERE
FROM_EMAIL=onboarding@resend.dev
```

## Step-by-Step Setup

### 1. Get Your API Key

You already have: `re_hpZX8zya_GaWu9Tp2i22LkWVw3cU6GZWx`

If you need to generate a new one:
1. Go to [resend.com](https://resend.com)
2. Log in to your dashboard
3. Go to **API Keys**
4. Click **Create API Key**
5. Copy the key

### 2. Set Your FROM_EMAIL

Resend provides a default: `onboarding@resend.dev`

For production, you can set up a custom domain:
1. Go to **Domains** in Resend dashboard
2. Add your domain (e.g., `mail.fortress-optimizer.com`)
3. Follow DNS verification steps
4. Update `FROM_EMAIL` in `.env.local`

### 3. Add to `.env.local`

```env
RESEND_API_KEY=re_hpZX8zya_GaWu9Tp2i22LkWVw3cU6GZWx
FROM_EMAIL=onboarding@resend.dev
```

For production with custom domain:
```env
RESEND_API_KEY=re_hpZX8zya_GaWu9Tp2i22LkWVw3cU6GZWx
FROM_EMAIL=support@fortress-optimizer.com
```

### 4. Restart Dev Server

```bash
npm run dev
```

### 5. Test It

Visit `http://localhost:3000/support` and submit the contact form. You should receive the email!

---

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

---

## Pricing

- **Free tier**: 100 emails/day (3,000/month)
- **Paid tier**: $20/month for unlimited emails
- **Perfect for**: Transactional emails (welcome, reset, notifications)

At 10k users with 1.5 emails each = 15,000 emails/month = $20/month

---

## Testing in Development

Resend emails send immediately. To test:
1. Use a real email address you have access to
2. Check spam folder if email doesn't arrive
3. Look at Resend dashboard → **Activity** to see logs

---

## Troubleshooting

**"Email service not configured"**
- Check `RESEND_API_KEY` is in `.env.local`
- Verify key format: `re_xxxxx`
- Restart dev server

**Email not arriving**
- Check spam folder
- Verify recipient email is correct
- Check Resend dashboard for any errors

**Custom domain emails not working**
- Make sure domain is verified in Resend
- Allow time for DNS propagation (~15 min)
- Check domain DNS records are correct

---

## Next Steps

1. ✅ Copy API key to `.env.local`
2. ✅ Restart dev server
3. ✅ Test contact form at `/support`
4. ✅ Set up custom domain for production (when ready)

You're all set! 🚀
