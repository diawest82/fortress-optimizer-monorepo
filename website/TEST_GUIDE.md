# Authentication Testing Guide

This guide walks you through testing every aspect of the Fortress Token Optimizer authentication system.

## Prerequisites

- Development server running: `npm run dev`
- Server accessible at: `http://localhost:3000`
- Browser with cookie support enabled
- Ability to clear browser data/cookies

---

## Part 1: User Registration (Sign Up)

### Test 1.1: Happy Path - Valid Signup
**Goal**: Successfully create a new account

**Steps**:
1. Go to http://localhost:3000/auth/signup
2. Fill in the form:
   - Email: `test.user@fortress.dev`
   - Name: `Test User`
   - Password: `TestPassword123`
   - Confirm: `TestPassword123`
   - ✓ Check "I agree to Terms of Service"
3. Click "Create account"

**Expected Results**:
- ✅ Form validates without errors
- ✅ User is created in the system
- ✅ You are automatically logged in
- ✅ Redirected to `/account` dashboard
- ✅ Dashboard shows your email and name

**What's Happening**:
1. Password is hashed with bcryptjs (not stored in plaintext)
2. JWT token is generated
3. HTTP-only cookie is set
4. Session is created

---

### Test 1.2: Password Strength Validation
**Goal**: Verify password validation and strength indicator

**Steps**:
1. Go to http://localhost:3000/auth/signup
2. Start typing in the password field

**Expected Results**:
- 🔴 **Weak**: < 8 characters or basic (red indicator)
- 🟡 **Medium**: 8-12 characters (yellow indicator)
- 🟢 **Strong**: 12+ characters with mixed case (green indicator)

**Test Cases**:
- `abc` → Weak (too short)
- `password` → Medium (8 chars, lowercase)
- `Password1` → Medium (9 chars, mixed case)
- `MySecurePassword123!` → Strong (long with symbols)

---

### Test 1.3: Duplicate Email Prevention
**Goal**: Prevent signup with existing email

**Steps**:
1. Create account with: `duplicate@fortress.dev` (do this first if not already done)
2. Try to signup again with the same email
3. Try to signup with same email but different case: `Duplicate@Fortress.Dev`

**Expected Results**:
- ✅ First signup succeeds
- ❌ Second signup fails with error: "Email already in use"
- ❌ Case-insensitive check also fails (email should be unique)

---

### Test 1.4: Weak Password Rejection
**Goal**: Ensure weak passwords are rejected

**Steps**:
1. Go to http://localhost:3000/auth/signup
2. Try these passwords:
   - `abc123` (6 chars - too short)
   - `password` (8 chars but no numbers/symbols)
3. Try to submit form

**Expected Results**:
- ❌ Error message appears
- ❌ Form won't submit
- ✅ Message tells you password requirements

---

### Test 1.5: Form Validation
**Goal**: Ensure all fields are validated

**Test Cases**:
1. Submit with empty email → Error: "Email is required"
2. Submit with invalid email → Error: "Invalid email"
3. Submit with empty password → Error: "Password is required"
4. Submit with mismatched passwords → Error: "Passwords don't match"
5. Submit without checking terms → Error: "You must agree to terms"

**Expected Results**:
- ❌ Form doesn't submit
- ✅ Error messages are clear and helpful
- ✅ Focus moves to first invalid field

---

## Part 2: User Login

### Test 2.1: Happy Path - Valid Login
**Goal**: Successfully login with correct credentials

**Steps**:
1. First, ensure you have an account (use Test 1.1)
2. Logout (click "Log out" button in account dashboard)
3. Go to http://localhost:3000/auth/login
4. Fill in:
   - Email: `test.user@fortress.dev`
   - Password: `TestPassword123`
5. Click "Log in"

**Expected Results**:
- ✅ Login succeeds
- ✅ You're redirected to `/account` dashboard
- ✅ Dashboard shows your email
- ✅ Session cookie is set (HTTP-only, secure)

**What's Happening**:
1. Email is looked up in the database
2. Password is compared with stored hash
3. JWT token is generated
4. Session cookie is set with 30-day expiry

---

### Test 2.2: "Stay Logged In" Checkbox
**Goal**: Verify session persistence option

**Steps**:
1. Go to http://localhost:3000/auth/login
2. **First attempt**: Login WITHOUT checking "Stay logged in"
3. Close browser completely
4. Reopen browser and visit `/account`
5. **Second attempt**: Login WITH "Stay logged in" checked
6. Close and reopen browser, visit `/account`

**Expected Results**:
- First attempt: Session might expire faster (24h)
- Second attempt: Session persists longer
- Both: After 30 days, you'll need to login again

---

### Test 2.3: Incorrect Password
**Goal**: Verify wrong password is rejected

**Steps**:
1. Go to http://localhost:3000/auth/login
2. Use correct email but wrong password:
   - Email: `test.user@fortress.dev`
   - Password: `WrongPassword123`
3. Click "Log in"

**Expected Results**:
- ❌ Login fails
- ✅ Error message: "Invalid email or password"
- ✅ You stay on login page
- ✅ No session is created

---

### Test 2.4: Non-existent Email
**Goal**: Verify non-existent account is rejected

**Steps**:
1. Go to http://localhost:3000/auth/login
2. Use non-existent email:
   - Email: `nobody@fortress.dev`
   - Password: `AnyPassword123`
3. Click "Log in"

**Expected Results**:
- ❌ Login fails
- ✅ Error message: "Invalid email or password"
- ✅ No session created
- ✅ No indication of whether email exists (security)

---

### Test 2.5: CallbackUrl Redirect
**Goal**: Verify user is redirected to requested page after login

**Steps**:
1. Logout (if logged in)
2. Try to access: `http://localhost:3000/account`
3. You'll be redirected to: `http://localhost:3000/auth/login?callbackUrl=%2Faccount`
4. Login with valid credentials

**Expected Results**:
- ✅ After login, you're redirected to `/account`
- ✅ Not just the homepage
- ✅ The `callbackUrl` parameter was used

---

## Part 3: Session Management

### Test 3.1: Session Persistence
**Goal**: Verify session persists across page refreshes

**Steps**:
1. Login to your account (use Test 2.1)
2. You're now at `/account` dashboard
3. Press F5 or Cmd+R to refresh the page
4. Wait for page to reload

**Expected Results**:
- ✅ Page reloads
- ✅ You're still logged in
- ✅ Dashboard shows your data
- ✅ No need to login again

**Why This Works**:
- JWT token is stored in HTTP-only cookie
- Token is automatically sent with each request
- Server validates token on each request
- Session is automatically refreshed

---

### Test 3.2: Session Expiry (30 days)
**Goal**: Understand when sessions expire

**Note**: You don't need to wait 30 days! This is just documentation.

**What Happens**:
- JWT token expires after 30 days
- Even if you close and reopen browser, you stay logged in
- After 30 days, you must login again
- Sessions are "touched" every 24 hours (auto-refreshed)

---

### Test 3.3: Cookie Inspection
**Goal**: Verify cookies are properly secured

**Steps**:
1. Login to your account
2. Open DevTools: F12 or Cmd+Option+I
3. Go to Application → Cookies → http://localhost:3000
4. Look for cookie named `next-auth.session-token`

**Expected Results**:
- ✅ Cookie exists
- ✅ **HttpOnly**: Checked (JavaScript can't access)
- ✅ **Secure**: (On HTTPS, not on localhost)
- ✅ **SameSite**: Lax (prevents CSRF)

---

### Test 3.4: Logout
**Goal**: Verify logout clears session properly

**Steps**:
1. Login to account
2. Click "Log out" button in header
3. Page redirects to home

**Expected Results**:
- ✅ You're logged out
- ✅ Redirected to `/`
- ✅ Session cookie is deleted
- ✅ Can't access `/account` without logging in

---

## Part 4: Protected Routes

### Test 4.1: Access /account Without Login
**Goal**: Verify protected routes redirect to login

**Steps**:
1. Make sure you're logged out (if logged in, logout)
2. Clear cookies (DevTools → Storage → Clear all)
3. Go directly to: `http://localhost:3000/account`

**Expected Results**:
- ✅ You're redirected to `/auth/login`
- ✅ URL becomes: `/auth/login?callbackUrl=%2Faccount`
- ✅ After login, you're redirected back to `/account`

**How It Works**:
- Middleware checks for valid JWT token
- If missing or invalid, redirects to login
- `callbackUrl` parameter remembers where you wanted to go

---

### Test 4.2: Access /auth/login When Logged In
**Goal**: Verify logged-in users skip login page

**Steps**:
1. Login to your account
2. Go to: `http://localhost:3000/auth/login`

**Expected Results**:
- ✅ You're redirected to `/account`
- ✅ Not to login page
- ✅ No login form is shown

---

### Test 4.3: Access /auth/signup When Logged In
**Goal**: Verify logged-in users skip signup page

**Steps**:
1. Login to your account
2. Go to: `http://localhost:3000/auth/signup`

**Expected Results**:
- ✅ You're redirected to `/account`
- ✅ Can't create another account while logged in

---

## Part 5: Account Dashboard

### Test 5.1: Dashboard Overview Tab
**Goal**: Verify dashboard displays user information

**Steps**:
1. Login to your account
2. You should be on `/account` → Overview tab
3. Look for:
   - Your email address
   - "Free" plan badge
   - Token usage metrics
   - Upgrade CTA

**Expected Results**:
- ✅ Email is correctly displayed
- ✅ Plan shows "Free"
- ✅ Usage metrics are shown (animated)
- ✅ All content loads without errors

---

### Test 5.2: API Keys Tab (NEW!)
**Goal**: Test API key generation and management

**Steps**:

#### Generate Key
1. Click "API Keys" tab
2. Click "Generate Key" button
3. Enter name: `Test Key`
4. Click "Create Key"

**Expected Results**:
- ✅ New key appears in list
- ✅ Key is formatted: `fk_prod_...`
- ✅ Key is masked (last part hidden)
- ✅ Shows "Created: [today's date]"
- ✅ Shows "Never used" until it's used

#### Copy Key
1. Look at the key you just created
2. Click "Copy" button

**Expected Results**:
- ✅ Button text changes to "Copied!"
- ✅ Key is copied to your clipboard
- ✅ After 2 seconds, button text reverts to "Copy"
- ✅ You can paste the full key: Cmd+V

#### Revoke Key
1. Click "Revoke" button on a key
2. Confirm the action

**Expected Results**:
- ✅ Key is immediately deleted
- ✅ Removed from the list
- ✅ If you try to use it, it fails

---

### Test 5.3: Settings Tab
**Goal**: Verify account settings are displayed

**Steps**:
1. Click "Settings" tab
2. Look for:
   - Email field (read-only)
   - Name field (read-only for now)
   - "Change Password" button

**Expected Results**:
- ✅ Email is correctly displayed
- ✅ Name is correctly displayed
- ✅ Fields are disabled/read-only
- ✅ Buttons are available for future features

---

### Test 5.4: Billing Tab
**Goal**: Verify billing information is shown

**Steps**:
1. Click "Billing & Usage" tab
2. Look for:
   - Current plan (Free)
   - Upgrade link to pricing

**Expected Results**:
- ✅ Plan information is shown
- ✅ Upgrade CTA is present
- ✅ Link to pricing page works

---

## Part 6: Multiple User Scenarios

### Test 6.1: Two Different Users
**Goal**: Verify multi-user support

**Steps**:
1. Create first account:
   - Email: `user1@fortress.dev`
   - Password: `Password123`
2. Note the dashboard and settings
3. Logout
4. Create second account:
   - Email: `user2@fortress.dev`
   - Password: `SecurePass456`
5. Verify different data is shown

**Expected Results**:
- ✅ First user has their own session
- ✅ Second user has different email/name
- ✅ Each user can see their own API keys
- ✅ Logout/login switches between users correctly

---

### Test 6.2: Concurrent Sessions (Not Supported)
**Goal**: Understand session behavior

**Steps**:
1. Login as user1 in regular browser
2. Open private/incognito window
3. Login as user2 in private window
4. Go back to regular window

**Expected Results**:
- ✅ Each window maintains its own session
- ✅ Regular window still shows user1
- ✅ Private window shows user2
- ✅ Sessions are independent

---

## Part 7: Security Tests

### Test 7.1: Password Storage
**Goal**: Verify passwords are hashed

**Note**: You can't directly verify this without accessing the database, but here's what's happening:

**Security Guarantee**:
- ✅ Passwords are hashed with bcryptjs
- ✅ 10 salt rounds for security
- ✅ Even if database is stolen, passwords are safe
- ✅ Each password hash is unique
- ✅ Can't reverse-engineer original password

### Test 7.2: API Key Format
**Goal**: Verify API keys are non-guessable

**Steps**:
1. Generate 3 API keys
2. Compare the keys

**Expected Results**:
- ✅ Each key is unique
- ✅ Keys start with `fk_prod_` or `fk_dev_`
- ✅ Remaining part is random
- ✅ Keys look like: `fk_prod_abc123def456...`
- ✅ Keys are long enough to be non-guessable

---

### Test 7.3: CSRF Protection
**Goal**: Understand CSRF protection

**What's Protected**:
- ✅ Session cookies have SameSite=Lax
- ✅ POST requests require CSRF token
- ✅ Cross-site requests can't modify your account

**How to Verify**:
1. Look at cookie attributes (Test 3.3)
2. Check DevTools → Network → POST requests
3. Verify `_csrf` token is present

---

## Part 8: Edge Cases

### Test 8.1: Rapid Clicks
**Goal**: Verify form handles rapid submission

**Steps**:
1. Go to signup form
2. Fill in all fields correctly
3. Click "Create account" multiple times rapidly

**Expected Results**:
- ✅ Only one account is created
- ✅ No duplicate accounts
- ✅ Request is debounced/throttled

---

### Test 8.2: Browser Back Button
**Goal**: Verify back button behavior

**Steps**:
1. Logout
2. Go to login
3. Login successfully (redirected to /account)
4. Click browser back button
5. You're on login page, but should still be logged in

**Expected Results**:
- ✅ Back button works
- ✅ Session is still valid
- ✅ If you go forward, you're at /account
- ✅ Session persists across navigation

---

### Test 8.3: Expired Session Handling
**Goal**: Understand what happens after 30 days

**Note**: Can't test this immediately, but here's the behavior:

**After 30 Days**:
- Session token expires
- User is logged out on next request
- User is redirected to login
- Previous password still works (password doesn't change)

---

## Part 9: Database Considerations

### Current Implementation (In-Memory)
- ✅ All auth flows work
- ❌ Data disappears on server restart
- ❌ Not suitable for production
- ⚠️ Single server only (no load balancing)

### After PostgreSQL Migration
- ✅ Data persists across restarts
- ✅ Multiple servers can share database
- ✅ Proper backups possible
- ✅ Production-ready

**When to Migrate**:
- Before first production deployment
- When you have multiple server instances
- When you need data persistence

---

## Test Summary Checklist

### Registration
- [ ] Can create account with valid data
- [ ] Password strength indicator works
- [ ] Duplicate emails rejected
- [ ] Weak passwords rejected
- [ ] All fields validated

### Login
- [ ] Can login with correct credentials
- [ ] Wrong password rejected
- [ ] Non-existent email rejected
- [ ] "Stay logged in" option works
- [ ] Redirect to callbackUrl works

### Sessions
- [ ] Session persists across page refreshes
- [ ] Logout clears session
- [ ] Cookies are HTTP-only
- [ ] Session expires after 30 days
- [ ] Session refreshes every 24 hours

### Protected Routes
- [ ] Can't access /account without login
- [ ] Logged-in users skip /auth pages
- [ ] Redirects to login with callbackUrl
- [ ] After login, redirects to original page

### Dashboard
- [ ] Overview tab shows user info
- [ ] API Keys tab allows generation
- [ ] API Keys can be copied
- [ ] API Keys can be revoked
- [ ] Settings tab shows correct data
- [ ] Billing tab shows plan info

### Security
- [ ] Passwords are hashed
- [ ] API keys are non-guessable
- [ ] Session cookies are secure
- [ ] CSRF protection is enabled

---

## Troubleshooting

### Can't Login
1. Check email is correct (case-insensitive)
2. Check password is exactly right
3. Verify account exists (try signup)
4. Clear cookies and try again

### Session Lost
1. Check if 30 days have passed
2. Verify `NEXTAUTH_SECRET` is set
3. Check browser time is correct
4. Try logging in again

### API Key Issues
1. Verify key is copied completely (no spaces)
2. Check key wasn't revoked
3. Try generating a new key
4. Check API is configured correctly

### Form Validation Issues
1. Check all required fields are filled
2. Verify email format is valid
3. Check passwords match
4. Verify password meets requirements
5. Check terms are checked

---

## Next Steps

1. **Run through all tests above** to verify auth system works
2. **Test with your own email** to ensure personal flow works
3. **Integrate with your app** - copy API keys and use them
4. **Set up database** when ready for persistence
5. **Configure OAuth** for social login options

---

## Support

- **Tests failing?** Check the [Integration Guide](./INTEGRATION_GUIDE.md)
- **Questions?** See [README_AUTH.md](./README_AUTH.md)
- **Bug reports?** Create an issue on GitHub

---

**Last Updated**: January 2025  
**Total Tests**: 30+  
**Estimated Time**: 1-2 hours
