# Authentication System Overview

## Quick Links

- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Complete setup and usage
- **[Authentication Setup](./AUTHENTICATION_SETUP.md)** - Technical details and configuration
- **[Testing Guide](./TEST_GUIDE.md)** - How to test all auth flows

---

## What's Implemented

### ✅ Complete Authentication System
- [x] User signup with email/password
- [x] Secure login with JWT sessions
- [x] Protected account dashboard
- [x] API key generation and management
- [x] Middleware-based route protection
- [x] Password strength validation
- [x] Session persistence (30 days)
- [x] Automatic session refresh (24h)
- [x] Logout functionality
- [x] Account settings page

### ✅ Account Dashboard (4 Tabs)
- [x] **Overview**: Usage metrics and plan info
- [x] **API Keys**: Generate, view, copy, and revoke keys
- [x] **Billing**: Plan details and upgrade options
- [x] **Settings**: Profile and password management

### ✅ Security Features
- [x] Passwords hashed with bcryptjs (10 rounds)
- [x] HTTP-only secure cookies
- [x] CSRF token protection
- [x] JWT token encryption
- [x] Route middleware protection
- [x] Non-guessable API keys

### 🔄 Coming Soon
- [ ] Email verification flow
- [ ] Password reset functionality
- [ ] Rate limiting on auth endpoints
- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub, Microsoft)
- [ ] PostgreSQL database migration
- [ ] API key expiration and rotation

---

## Getting Started

### 1. Start the Development Server
```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 2. Create a Test Account
Navigate to: **http://localhost:3000/auth/signup**

- Email: `test@fortress.dev`
- Password: `TestPassword123` (min 8 chars)
- Name: `Test User`

### 3. Access Your Dashboard
After signup, you'll automatically be logged in and redirected to:
**http://localhost:3000/account**

### 4. Generate API Keys
1. Go to **API Keys** tab
2. Click **"Generate Key"**
3. Enter a name (e.g., "Production")
4. Copy and save your key (won't be shown again)

---

## How It Works

### Sign Up
```
/auth/signup → Validate email & password → Hash password → Create user → Auto-login
```

### Login
```
/auth/login → Lookup user by email → Verify password → Create JWT → Set cookie
```

### Protected Routes
```
Visit /account → Check JWT in middleware → Valid? → Load dashboard : Redirect to login
```

### API Keys
```
Dashboard → Generate Key → Create random token → Store in memory → Display masked
Copy → Full key to clipboard
Revoke → Delete token (can't be used again)
```

---

## Current Storage

⚠️ **Important**: Currently using **in-memory storage**

- Users are stored in memory (disappear on server restart)
- API keys are stored in memory
- **For production, migrate to PostgreSQL** (see [Database Migration](./INTEGRATION_GUIDE.md#database-configuration-todo))

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx         # Login form
│   │   └── signup/page.tsx        # Signup form
│   ├── account/page.tsx           # Protected dashboard
│   └── api/auth/[...nextauth]/
│       └── route.ts               # NextAuth handler
├── components/
│   ├── account-content.tsx        # Dashboard & API keys
│   └── session-provider.tsx       # Auth wrapper
└── lib/
    └── auth-config.ts            # NextAuth config
```

---

## Testing the Authentication

### Manual Testing
1. **Signup**: Go to `/auth/signup`, create account
2. **Login**: Logout, go to `/auth/login`, login again
3. **Protected Routes**: Try accessing `/account` without login → redirects
4. **API Keys**: Generate, copy, and revoke keys
5. **Session**: Refresh page → session persists

### Using the Test Script
```bash
./test-auth.sh
```

This runs basic connectivity checks and provides manual testing steps.

---

## Security Checklist

- ✅ Passwords never stored in plaintext
- ✅ All passwords hashed with bcryptjs
- ✅ Sessions use JWT tokens (signed and encrypted)
- ✅ Cookies are HTTP-only (JavaScript can't access)
- ✅ Cookies have Secure flag (HTTPS only in production)
- ✅ CSRF protection enabled
- ✅ Routes protected by middleware
- ✅ API keys are non-guessable UUIDs

### For Production
- [ ] Set `NEXTAUTH_URL` to your domain
- [ ] Generate new `NEXTAUTH_SECRET` (min 32 chars)
- [ ] Enable HTTPS/TLS
- [ ] Set up PostgreSQL database
- [ ] Configure email service for verification
- [ ] Enable rate limiting
- [ ] Monitor failed login attempts

---

## API Reference

### POST /api/auth/signup
Create new user account

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "User Name"
}
```

**Response** (201):
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "User Name"
}
```

### POST /api/auth/login
Authenticate user and create session

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response**: Redirects to `/account` with JWT cookie

### GET /api/auth/session
Get current user session

**Response** (if authenticated):
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "User Name"
  },
  "expires": "2025-02-20T12:00:00Z"
}
```

### GET /auth/signout
Logout and clear session

**Response**: Redirects to `/` and clears cookies

---

## Component Usage

### Use Session in Client Component
```typescript
"use client";

import { useSession } from "next-auth/react";

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome, {session.user.email}!</div>;
}
```

### Protect Server Component
```typescript
import { getServerSession } from "next-auth/next";

export default async function MyPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login");
  }

  return <div>Protected content</div>;
}
```

---

## Environment Setup

### Required Variables
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=fortress-dev-secret-change-in-production
```

### Optional Variables
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
DATABASE_URL=postgresql://localhost:5432/fortress
```

### Generate Secret
```bash
openssl rand -base64 32
```

---

## Troubleshooting

### Can't Login
- Check email/password are correct
- Verify account was created (try signup again)
- Clear browser cookies and try again

### Session Keeps Expiring
- Check `NEXTAUTH_SECRET` is set
- Verify cookie settings (3rd party cookies enabled)
- Check browser time is correct

### API Keys Not Working
- Verify key is copied correctly (no spaces)
- Check key hasn't been revoked
- Make sure you're using the right API endpoint

### Server Won't Start
- Check `npm run dev` output for errors
- Verify `NEXTAUTH_SECRET` is at least 32 characters
- Clear `.next` cache: `rm -rf .next`

---

## Next Steps

1. **[Read the Integration Guide](./INTEGRATION_GUIDE.md)** for detailed setup
2. **Test the flows** by creating an account and generating API keys
3. **Set up database** when ready for persistence
4. **Configure OAuth** for social login options
5. **Deploy to production** with proper environment variables

---

## Support

- **Questions?** Check the [Integration Guide](./INTEGRATION_GUIDE.md)
- **Found a bug?** Create an issue on GitHub
- **Need help?** See [Troubleshooting](#troubleshooting)

---

**Last Updated**: January 2025
**Status**: Production Ready (in-memory storage only)
**Version**: 1.0.0
