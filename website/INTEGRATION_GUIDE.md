# Fortress Token Optimizer - Complete Integration Guide

## Quick Start

### 1. Create a Test Account

**URL**: http://localhost:3000/auth/signup

**Steps**:
1. Enter email: `test@fortress.dev`
2. Enter name: `Test User`
3. Enter password: `TestPassword123` (minimum 8 characters)
4. Confirm password: `TestPassword123`
5. Check "I agree to Terms of Service"
6. Click "Create account"

**Expected Result**:
- ✅ Account created successfully
- ✅ Automatically logged in
- ✅ Redirected to `/account` dashboard

### 2. Explore the Account Dashboard

**URL**: http://localhost:3000/account

**Available Tabs**:

#### Overview Tab
- Current plan status (Free)
- Token usage metrics (animated)
- Monthly usage tracking
- Upgrade CTA

#### API Keys Tab (NEW!)
- **Generate Key**: Create new API keys with custom names
- **View Keys**: See masked API keys and usage metadata
- **Copy**: Copy full API key to clipboard
- **Revoke**: Delete keys you no longer need
- **Last Used**: Track when keys were last used
- **Usage Examples**: Integration code snippets

#### Billing & Usage Tab
- Plan details and pricing
- Token quota information
- Usage statistics
- Upgrade/downgrade options

#### Settings Tab
- View/edit display name
- View email (read-only)
- Change password option

---

## API Key Management

### Generating an API Key

1. Go to Account Dashboard → **API Keys** tab
2. Click **"Generate Key"** button
3. Enter a descriptive name (e.g., "Production API Key")
4. Click **"Create Key"**
5. Copy the key (it won't be shown again)

### Using Your API Key

#### Format
```
fk_prod_abc123def456ghi789jkl012mno345
```

#### In Environment Variables
```env
FORTRESS_API_KEY=fk_prod_abc123def456...
```

#### In npm Package
```javascript
const optimizer = require('@fortress/optimizer');
optimizer.setApiKey(process.env.FORTRESS_API_KEY);

const result = await optimizer.optimize({
  text: 'Your prompt here',
  model: 'gpt-4'
});

console.log(`Saved ${result.savings}% of tokens!`);
```

#### In VS Code Extension
```
VS Code → Extensions → Fortress Optimizer → Settings
API Key: fk_prod_abc123def456...
Enable: "Optimize prompts in real-time"
```

#### In Slack Bot
```
/fortress auth fk_prod_abc123def456...
/fortress optimize "your prompt text here"
```

#### In Claude Desktop
```json
{
  "mcpServers": {
    "fortress": {
      "command": "npx",
      "args": ["@fortress/optimizer"],
      "env": {
        "FORTRESS_API_KEY": "fk_prod_abc123def456..."
      }
    }
  }
}
```

---

## Authentication Flows

### Sign Up Flow
```
User visits /auth/signup
     ↓
Fills in email, password, name
     ↓
Validates:
  - Email is unique
  - Password is 8+ characters
  - Terms accepted
     ↓
Creates user in database (currently in-memory)
     ↓
Hashes password with bcryptjs (10 rounds)
     ↓
Generates JWT token
     ↓
Sets HTTP-only secure cookie
     ↓
Redirects to /account (logged in)
```

### Login Flow
```
User visits /auth/login
     ↓
Enters email and password
     ↓
Looks up user by email
     ↓
Compares password with hash
     ↓
Generates JWT token
     ↓
Sets HTTP-only secure cookie
     ↓
Redirects to /account (or callbackUrl)
```

### Protected Route Flow
```
User visits /account without session
     ↓
Middleware checks for JWT token
     ↓
Token missing or invalid
     ↓
Redirects to /auth/login?callbackUrl=/account
     ↓
User logs in
     ↓
Redirected back to original URL (/account)
```

---

## Session Management

### Session Duration
- **Token Lifespan**: 30 days
- **Update Interval**: 24 hours (refreshes automatically)
- **Storage**: HTTP-only cookies (cannot be accessed by JavaScript)
- **Security**: Signed and encrypted with NEXTAUTH_SECRET

### Session Data

```typescript
interface Session {
  user: {
    id: string;        // Unique user ID
    email: string;     // User's email
    name: string;      // Display name
    image?: string;    // Avatar URL (optional)
  };
  expires: string;     // ISO date string
}
```

### Accessing Session in Components

```typescript
"use client";

import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      Welcome, {session.user.email}!
      <p>User ID: {session.user.id}</p>
    </div>
  );
}
```

### Logging Out

```typescript
import { signOut } from "next-auth/react";

// Call in event handler
await signOut({ callbackUrl: "/" });
```

---

## Testing Scenarios

### Scenario 1: Complete User Journey
- [ ] Sign up with new account
- [ ] Verify auto-login to dashboard
- [ ] Generate first API key
- [ ] Copy API key to clipboard
- [ ] Logout
- [ ] Login with same credentials
- [ ] Verify API key still exists
- [ ] Revoke API key
- [ ] Generate new API key

### Scenario 2: Protected Routes
- [ ] Try accessing /account without login → redirects to /auth/login
- [ ] Try accessing /account with invalid session → redirects to /auth/login
- [ ] Login with valid credentials → redirects to /account
- [ ] Visit /account directly → should load dashboard

### Scenario 3: Session Persistence
- [ ] Login to account
- [ ] Refresh the page → session persists
- [ ] Close and reopen browser → session still valid (30 days)
- [ ] Logout → session cleared

### Scenario 4: Password Validation
- [ ] Try signup with <8 character password → error shown
- [ ] Try signup with weak password → strength indicator shows "Weak"
- [ ] Try signup with 12+ mixed-case password → strength shows "Strong"
- [ ] Try signup with duplicate email → error "Email already in use"

### Scenario 5: API Key Security
- [ ] Generate API key → full key displayed once
- [ ] Copy key → should copy full key to clipboard
- [ ] Refresh page → key is masked
- [ ] Revoke key → key is deleted and can't be used
- [ ] Try using revoked key → returns 401 Unauthorized

---

## Current Architecture

### Tech Stack
- **Framework**: Next.js 16.1.6 with TypeScript
- **Auth Provider**: NextAuth.js v5
- **Password Hashing**: bcryptjs (10 salt rounds)
- **Session Strategy**: JWT (JSON Web Tokens)
- **Cookie Storage**: HTTP-only, Secure, SameSite=Lax
- **Styling**: Tailwind CSS

### File Structure
```
src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── signup/
│   │       └── page.tsx          # Signup page
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # NextAuth handler
│   ├── account/
│   │   └── page.tsx              # Protected dashboard
│   └── layout.tsx                # App layout with AuthProvider
├── lib/
│   └── auth-config.ts            # NextAuth configuration
├── components/
│   ├── account-content.tsx       # Dashboard tabs and content
│   ├── session-provider.tsx      # Client-side session wrapper
│   └── site-header.tsx           # Navigation with auth links
└── middleware.ts                 # Route protection
```

---

## Database Configuration (TODO)

Currently using **in-memory storage** (users disappear on server restart).

### Migration to PostgreSQL

1. **Install dependencies**:
```bash
npm install @prisma/client
npm install -D prisma
```

2. **Initialize Prisma**:
```bash
npx prisma init
```

3. **Configure `.env.local`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/fortress_db"
```

4. **Define schema** in `prisma/schema.prisma`:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String   // bcryptjs hash
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  apiKeys   ApiKey[]
}

model ApiKey {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  revokedAt DateTime?
}
```

5. **Run migration**:
```bash
npx prisma migrate dev --name init
```

6. **Update `auth-config.ts`** to use Prisma Client instead of in-memory object.

---

## Security Features

### Implemented ✅
- **Password Hashing**: bcryptjs with 10 salt rounds
- **Session Security**: HTTP-only, Secure, SameSite cookies
- **CSRF Protection**: CSRF tokens in session
- **JWT Encryption**: Tokens are signed and encrypted
- **Route Protection**: Middleware-based access control
- **API Key Format**: Non-guessable (UUID-based)

### Planned ⏳
- **Email Verification**: Confirm email on signup
- **Password Reset**: Forgot password flow
- **Rate Limiting**: Prevent brute force attacks
- **2FA/MFA**: Two-factor authentication
- **IP Whitelisting**: Restrict API key usage by IP
- **API Key Rotation**: Automatic key refresh

---

## Error Handling

### Common Errors and Solutions

**"Email already in use"**
- User already has an account
- Try login instead of signup
- Or use a different email

**"Invalid password"**
- Password must be at least 8 characters
- Use mix of letters, numbers, and special characters
- Check Caps Lock

**"Session expired"**
- Token is older than 30 days
- Login again
- Sessions auto-refresh every 24 hours if used

**"API key not found"**
- Key was revoked
- Key is incorrect (check for spaces when copying)
- Key belongs to different account

---

## Support Resources

- **Docs**: [Full Authentication Documentation](./AUTHENTICATION_SETUP.md)
- **Integration Guides**: See `/docs` for each platform
- **API Reference**: Endpoints and schemas
- **Status Page**: Monitor system status
- **GitHub Issues**: Report bugs and request features

---

## Environment Variables

Required in `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Database (future)
DATABASE_URL=postgresql://user:pass@localhost:5432/fortress

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Important**: 
- `NEXTAUTH_SECRET` must be at least 32 characters
- Keep it secret and don't commit to version control
- Change it in production
- Generate with: `openssl rand -base64 32`
