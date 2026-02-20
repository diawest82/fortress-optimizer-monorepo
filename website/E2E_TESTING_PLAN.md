# END-TO-END TESTING PLAN
**February 19, 2026**

## Test Scenarios

### SCENARIO 1: User Signup → Support Ticket → Email

**Preconditions:**
- Website running locally or in production
- Resend API key configured
- Database migrated

**Steps:**
1. Visit https://fortress-optimizer.com/auth/signup
2. Create account with test email
3. Confirm email in Resend dashboard
4. Login to account
5. Go to Account → Support tab
6. Create support ticket:
   - Subject: "Test Support Request"
   - Description: "This is a test"
   - Category: "technical"
   - Priority: "high"
7. Click "Create Ticket"

**Expected Results:**
- ✅ Ticket displays with ticket number (FORT-XXXXXX)
- ✅ Confirmation email sent to user's email address
- ✅ Email contains ticket number and SLA information
- ✅ Email includes link back to account dashboard
- ✅ GET /api/support/tickets returns ticket in list

**Database Verification:**
```sql
SELECT * FROM "SupportTicket" WHERE "creatorEmail" = 'test@example.com';
-- Should show ticket with status='open'
```

---

### SCENARIO 2: Team Creation → Team Display

**Preconditions:**
- User logged in (from Scenario 1 or new account)
- User on Teams tier (or upgraded)

**Steps:**
1. Go to Account → Team Management tab
2. Click "Create Team"
3. Enter team name: "QA Team"
4. Click "Create"

**Expected Results:**
- ✅ Team appears in list immediately
- ✅ Shows "1/5 members" (owner included)
- ✅ Owner designation shows
- ✅ GET /api/teams returns team in list
- ✅ Team slug auto-generated (qa-team)

**Database Verification:**
```sql
SELECT * FROM "Team" WHERE name = 'QA Team';
-- Should show team with ownerId = logged-in user
```

---

### SCENARIO 3: Token Limit Check (Free Tier)

**Preconditions:**
- User on Free tier
- User ID known

**Steps (via API):**
```bash
curl -X POST https://fortress-optimizer.com/api/optimize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing", "level": "balanced"}'
```

**Expected Results:**
- ✅ First request succeeds (tokens available)
- ✅ Response includes token count (original + optimized)
- ✅ After 50,000 tokens used, next request returns 429 (rate limited)
- ✅ User sees message: "Token limit exceeded. Used: 50,000/50,000"

**Token Tracking:**
- Log shows tokens consumed
- Next month (after reset day), limit resets

---

### SCENARIO 4: Email Configuration Verification

**Preconditions:**
- RESEND_API_KEY environment variable set
- Test email account ready

**Steps:**
1. Create support ticket with valid email
2. Check email account (both inbox and spam)
3. Verify email subject and content
4. Click link in email to return to dashboard

**Expected Results:**
- ✅ Email arrives within 30 seconds
- ✅ Subject line: "Support Ticket Created: FORT-XXXXXX"
- ✅ Email from: FROM_EMAIL (configured in .env)
- ✅ Email contains correct ticket information
- ✅ Link to dashboard works

---

### SCENARIO 5: Subscription Management

**Preconditions:**
- User logged in
- On pricing page

**Steps:**
1. Go to /pricing
2. Click "Subscribe now" for Teams tier
3. Enter test Stripe card (see Stripe test cards below)
4. Complete payment flow
5. Return to account dashboard

**Expected Results:**
- ✅ Subscription tab shows "Teams" tier
- ✅ Next billing date displays
- ✅ Token limit increases from 50K to unlimited
- ✅ Team feature tab becomes active
- ✅ Can now create teams with multiple members

---

### SCENARIO 6: API Key Management

**Preconditions:**
- User logged in
- On account page

**Steps:**
1. Go to Account → API Keys tab
2. Click "Create API Key"
3. Enter name: "Test Key"
4. Copy key that appears
5. Use key in curl request

**Expected Results:**
- ✅ API key generated and displayed once
- ✅ Copy button works
- ✅ Key appears in list (masked)
- ✅ Can be used for API requests
- ✅ Can be revoked/deleted

---

## Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Require Auth: 4000 0025 0000 3155
Expired: 4000 0000 0000 9995

All use:
- Expiry: Any future date (12/25)
- CVC: Any 3 digits (123)
- ZIP: Any 5 digits (12345)
```

---

## Database Verification Commands

### Check Support Tickets
```sql
SELECT id, "ticketNumber", subject, status, "createdAt" 
FROM "SupportTicket" 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### Check Teams
```sql
SELECT id, name, slug, "ownerId", "createdAt"
FROM "Team"
ORDER BY "createdAt" DESC;
```

### Check Team Members
```sql
SELECT t.name, u.email, u.name
FROM "Team" t
LEFT JOIN "_TeamToUser" tu ON t.id = tu.A
LEFT JOIN "User" u ON u.id = tu.B
ORDER BY t.name;
```

### Check User Tiers
```sql
SELECT email, "stripeCustomerId", "billingCycleDay"
FROM "User"
LIMIT 10;
```

---

## Logging & Monitoring

### Check Logs for Errors
```bash
# Vercel logs
vercel logs --prod

# Or check server logs
npm run build && npm run start
```

### Monitor Email Sends
```bash
# Check Resend dashboard
# https://resend.com/dashboard

# Should show all emails sent to test addresses
```

### Monitor API Calls
```bash
# Check in Stripe dashboard if payments processed
# Check in Vercel analytics for API calls

# Or add logging:
console.log(`Support ticket created: ${ticketNumber}`);
```

---

## Test Data Cleanup

### Delete Test Support Tickets
```sql
DELETE FROM "SupportResponse" WHERE "supportTicketId" IN (
  SELECT id FROM "SupportTicket" WHERE "creatorEmail" = 'test@example.com'
);
DELETE FROM "SupportTicket" WHERE "creatorEmail" = 'test@example.com';
```

### Delete Test Teams
```sql
DELETE FROM "_TeamToUser" WHERE A IN (
  SELECT id FROM "Team" WHERE name LIKE 'Test%'
);
DELETE FROM "Team" WHERE name LIKE 'Test%';
```

### Delete Test Users
```sql
DELETE FROM "User" WHERE email LIKE 'test%@example.com';
```

---

## Performance Baselines

Expected response times:
- **POST /api/support/tickets:** < 500ms (database write)
- **GET /api/support/tickets:** < 300ms (database read)
- **POST /api/teams:** < 500ms (database write)
- **GET /api/teams:** < 300ms (database read)
- **Email send:** < 2 seconds (Resend API)

---

## Known Limitations (Pre-Production)

- [ ] Stripe in test mode (user will enable production)
- [ ] Email templates basic (can be enhanced)
- [ ] Analytics data placeholder (no real aggregation yet)
- [ ] Token tracking placeholder (no actual usage recording)
- [ ] VSCode extension: missing class implementations (being built)

---

## Sign-Off Checklist

- [ ] Support ticket creation works
- [ ] Support tickets persist in database
- [ ] Confirmation email sends
- [ ] Team creation works
- [ ] Teams persist in database
- [ ] API authentication works
- [ ] Rate limiting works
- [ ] Subscription tier changes work
- [ ] All features accessible from account dashboard
- [ ] No TypeScript errors
- [ ] No runtime errors in console
- [ ] Responsive on mobile
- [ ] All pages load under 2 seconds

---

## SIGN-OFF

This document serves as the E2E test plan. When you complete the test scenarios and verify results, the website is production-ready.

Estimated testing time: 1-2 hours

---
