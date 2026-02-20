# Fortress Token Optimizer - Authentication & Integration Setup

## Overview
This document covers the complete authentication flow, testing procedures, and how users connect their accounts to tools.

## Current Setup

### Technology Stack
- **Auth Provider**: NextAuth.js v5
- **Password Hashing**: bcryptjs (10-round salt)
- **Session Strategy**: JWT with 30-day expiry
- **Session Storage**: HTTP-only secure cookies with CSRF protection
- **OAuth**: Google (ready for configuration)

### Current Storage
⚠️ **NOTE**: Currently using in-memory storage. Must migrate to PostgreSQL for production.

---

## 1. Testing the Authentication Flow

### 1.1 Sign Up Process

**Endpoint**: `POST /api/auth/signup`

**Test via Browser**:
1. Go to http://localhost:3000/auth/signup
2. Fill in:
   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `SecurePassword123` (min 8 chars)
   - Confirm Password: `SecurePassword123`
   - Check "I agree to Terms of Service"
3. Click "Create account"
4. You should be automatically logged in and redirected to `/account`

**Test via cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123",
    "name": "Test User"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "user_1",
  "email": "test@example.com",
  "name": "Test User"
}
```

**Password Requirements**:
- Minimum 8 characters
- Strength indicator shows:
  - 🔴 Weak: < 8 chars
  - 🟡 Medium: 8-12 chars or basic
  - 🟢 Strong: 12+ chars with mixed case/numbers

---

### 1.2 Login Process

**Endpoint**: `POST /api/auth/callback/credentials`

**Test via Browser**:
1. Go to http://localhost:3000/auth/login
2. Fill in:
   - Email: `test@example.com`
   - Password: `SecurePassword123`
   - Optional: Check "Stay logged in"
3. Click "Log in"
4. You should be redirected to `/account` dashboard

**Test via cURL** (NextAuth handles this automatically):
```bash
# NextAuth credentials are handled through session mechanism
# Browser must support cookies for this to work
```

---

### 1.3 Protected Routes

**Middleware Protection** (`/src/middleware.ts`):
- Route: `/account/*` - Requires authentication
- Route: `/auth/login` & `/auth/signup` - Redirects logged-in users to `/account`

**Test Protected Route**:
1. **Without Login**: Go to http://localhost:3000/account
   - Should redirect to `/auth/login?callbackUrl=/account`
2. **With Login**: After logging in, `/account` should load
   - Should display user's email, name, and dashboard tabs

---

## 2. Account Dashboard Features

### 2.1 Overview Tab
- Display current plan (Free, Pro, Team, Enterprise)
- Token usage metrics
- Request count
- Active channels
- Upgrade CTA

### 2.2 API Keys Tab
- Generate new API keys
- View active keys
- Revoke keys
- Copy key to clipboard
- (Currently shows upgrade prompt for Pro feature)

### 2.3 Billing & Usage Tab
- Current plan details
- Token quota and usage
- Pricing information
- Upgrade/downgrade options

### 2.4 Settings Tab
- View/edit profile name
- View email (read-only)
- Change password option
- Privacy settings

---

## 3. Connecting Account to Tools

### 3.1 API Key Generation

**Flow**:
1. User logs into https://fortress.example.com/account
2. Navigates to "API Keys" tab
3. Clicks "Generate New Key"
4. System returns API key: `fk_prod_xyz123...`
5. User copies key to clipboard

**Usage in Tools**:

#### npm Package
```javascript
const optimizer = require('@fortress/optimizer');

optimizer.setApiKey('fk_prod_xyz123...');

const result = await optimizer.optimize({
  text: 'Your prompt here',
  model: 'gpt-4'
});

console.log(result.optimized);   // Optimized text
console.log(result.savings);     // 18% saved
```

#### GitHub Copilot Extension
```javascript
// Settings → Extensions → Fortress Optimizer
// Paste API key: fk_prod_xyz123...
// Enable in Copilot context
```

#### VS Code Extension
```
Extensions → Fortress Optimizer → Settings
API Key: fk_prod_xyz123...
Toggle: "Optimize prompts in real-time"
```

#### Slack Bot
```
/fortress auth fk_prod_xyz123...
/fortress optimize "your prompt here"
```

#### Claude Desktop
```json
{
  "tools": {
    "fortress": {
      "apiKey": "fk_prod_xyz123...",
      "autoOptimize": true
    }
  }
}
```

---

## 4. Session Management

### 4.1 Session Duration
- **Max Age**: 30 days
- **Update Age**: 24 hours
- **Token Type**: JWT (encrypted, signed)
- **Cookies**: HTTP-only, Secure flag enabled

### 4.2 Session Callbacks
```typescript
// Session callback - runs on login and every 24h
async session({ session, token }) {
  // Extend session with user.id
  session.user.id = token.sub;
  return session;
}

// JWT callback - runs on signIn/signUp
async jwt({ token, user }) {
  if (user) {
    token.sub = user.id;
  }
  return token;
}
```

### 4.3 Logout
```javascript
import { signOut } from "next-auth/react";

// Client-side logout
await signOut({ callbackUrl: "/" });
```

---

## 5. Database Migration (TODO)

### 5.1 Current Limitation
- In-memory storage (users disappear on server restart)
- Not suitable for production

### 5.2 Migration Steps

**1. Install Prisma**:
```bash
npm install @prisma/client @prisma/migrate
npm install -D prisma
```

**2. Initialize Prisma**:
```bash
npx prisma init
```

**3. Configure `.env.local`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/fortress_db"
```

**4. Create Schema** (`/prisma/schema.prisma`):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  apiKeys   ApiKey[]
}

model ApiKey {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  revokedAt DateTime?
}
```

**5. Run Migration**:
```bash
npx prisma migrate dev --name init
```

**6. Update `auth-config.ts`** to use Prisma instead of in-memory storage.

---

## 6. Security Checklist

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ Never store plaintext passwords
- ✅ CSRF tokens in session cookies
- ✅ HTTP-only secure cookies
- ✅ JWT tokens encrypted and signed
- ✅ Middleware protects routes
- ⚠️ TODO: Rate limiting on auth endpoints
- ⚠️ TODO: Email verification
- ⚠️ TODO: Password reset flow
- ⚠️ TODO: 2FA support

---

## 7. Environment Variables

Required in `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=fortress-dev-secret-change-in-production-12345

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database (future)
DATABASE_URL=postgresql://user:password@localhost:5432/fortress
```

---

## 8. Testing Checklist

### Authentication Tests
- [ ] Sign up with valid email/password
- [ ] Sign up fails with weak password
- [ ] Sign up fails with existing email
- [ ] Login with valid credentials
- [ ] Login fails with wrong password
- [ ] Protected routes redirect to login
- [ ] Logout clears session
- [ ] Session persists across page refresh (30 days)

### Security Tests
- [ ] Passwords are hashed (not plaintext)
- [ ] Session cookies are HTTP-only
- [ ] CSRF token present in cookies
- [ ] JWT tokens are signed and encrypted
- [ ] API keys can't be guessed (UUID format)

### Integration Tests
- [ ] Sign up redirects to account
- [ ] Account dashboard loads user data
- [ ] API keys tab shows upgrade prompt (Pro feature)
- [ ] Settings tab shows user email/name
- [ ] Logout button works from header

---

## 9. Support & Troubleshooting

**User can't log in**:
1. Check email/password are correct
2. Verify account was created (check browser console for errors)
3. Clear browser cookies and try again

**Session expires immediately**:
1. Check `NEXTAUTH_SECRET` is set in `.env.local`
2. Verify cookie settings in browser (allow 3rd party cookies)

**API key not working**:
1. Check key is correctly copied (watch for spaces)
2. Verify tool is using correct endpoint
3. Check API key wasn't revoked in dashboard

---

## 10. Next Steps

1. **Database Setup**: Migrate from in-memory to PostgreSQL
2. **Email Verification**: Add email confirmation flow
3. **Password Reset**: Implement forgot password feature
4. **API Rate Limiting**: Protect endpoints from abuse
5. **2FA**: Add two-factor authentication option
6. **OAuth Providers**: Configure Google, GitHub, Microsoft
7. **API Documentation**: Generate API docs for tool integrations
