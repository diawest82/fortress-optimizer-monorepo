# Mailgun Setup Checklist

## ✅ Completed
- [x] Mailgun SDK installed (`mailgun.js`)
- [x] Email utility functions created
- [x] Contact form component built
- [x] API endpoint for `/api/contact` created
- [x] Support page at `/support` created with FAQ
- [x] Environment variables documented
- [x] Dev server running

## 📋 Next Steps (Your Action Items)

### 1. Create Mailgun Account (5 minutes)
- [ ] Go to https://mailgun.com and sign up (free account)
- [ ] Verify your email
- [ ] Log in to dashboard

### 2. Get Your API Credentials (2 minutes)
- [ ] Go to **Settings** → **API Security**
- [ ] Copy your **API Key** (looks like `key-xxxxx`)
- [ ] Note your **Domain** from **Sending** → **Domains**
  - If sandbox: `sandboxXXXX.mailgun.org`
  - If custom: `mg.fortress-optimizer.com`

### 3. Add Environment Variables (1 minute)
- [ ] Open `.env.local` in your editor
- [ ] Add these three lines:
  ```env
  MAILGUN_API_KEY=key-your-actual-key-here
  MAILGUN_DOMAIN=sandboxXXXX.mailgun.org
  FROM_EMAIL=support@fortress-optimizer.com
  ```
- [ ] Save the file

### 4. Restart Dev Server (1 minute)
- [ ] Kill the current dev server (Ctrl+C)
- [ ] Run: `npm run dev`
- [ ] Wait for "Ready in XXXms"

### 5. Test the Contact Form (2 minutes)
- [ ] Open http://localhost:3000/support
- [ ] Fill out and submit the form
- [ ] Should see "Thanks for reaching out!" message
- [ ] Check your email (may be in spam)

## 🔑 Using Mailgun (After Setup)

**Send Welcome Email to New Users:**
```typescript
import { sendWelcomeEmail } from '@/lib/email';

// In your signup endpoint
await sendWelcomeEmail(user.email, user.name);
```

**Send Custom Email:**
```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Your Subject',
  html: '<p>Your email content</p>',
});
```

## 📊 Free Tier Limits

- **5,000 emails/month** (free)
- **100k emails/month:** $75
- **At 10k users:** ~$11/month

## 🆘 Need Help?

1. **Form not sending?** → Check `.env.local` has correct keys and restart
2. **Email not arriving?** → Check Mailgun dashboard logs
3. **Error messages?** → See `MAILGUN_SETUP.md` troubleshooting section

---

**Total setup time: ~15 minutes**

Once you complete these steps, your support form will be fully functional and ready to receive messages from users!
