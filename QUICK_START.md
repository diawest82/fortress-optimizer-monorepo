# Quick Start Guide - Phase 1 & 2 Complete

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Python 3.9+ for backend (optional)
- npm or yarn package manager

---

## ⚡ Quick Start (Frontend Only)

```bash
# Navigate to website directory
cd /Users/diawest/projects/fortress-optimizer-monorepo/website

# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

**Frontend will be running at**: http://localhost:3000

---

## 🔑 Test Credentials

To test the authentication system:

### Test User 1 (Signup First)
```
Email: test@example.com
Password: Test123456
Name: Test User
```

### Test User 2 (Pre-created on backend)
```
Email: user@example.com
Password: password123
```

---

## 🧪 Testing the Authentication Flow

### 1. **Test Signup**
   - Navigate to http://localhost:3000/auth/signup
   - Fill in: Email, Password, Name
   - Submit form
   - Should redirect to dashboard if backend available
   - Otherwise shows error but component still works

### 2. **Test Login**
   - Navigate to http://localhost:3000/auth/login
   - Use credentials from above
   - Click "Log In"
   - Should redirect to dashboard

### 3. **Test Protected Route**
   - Try navigating to http://localhost:3000/dashboard without logging in
   - Browser should attempt to redirect (protected at runtime)

### 4. **Test Dashboard**
   - After login, dashboard shows:
     - Real API data (if backend running)
     - Mock data (if backend unavailable)
     - Time range selector (24h, 7d, 30d, 90d)
     - Platform filter selector
     - Auto-refresh indicator

---

## 📁 Important Files Reference

### Authentication
```
src/
├── context/
│   └── AuthContext.tsx          # Global auth state
├── lib/
│   └── api.ts                   # API client with all endpoints
├── components/
│   └── ProtectedRoute.tsx        # Route protection wrapper
└── app/
    ├── auth/
    │   ├── signup/page.tsx      # Signup form
    │   └── login/page.tsx       # Login form
    └── layout.tsx               # Root layout with AuthProvider
```

### Dashboard
```
src/
└── app/
    └── dashboard/page.tsx       # Dashboard with API integration
```

---

## 🔗 API Endpoints Available

When backend is running at http://localhost:8000:

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh JWT token

### User
- `GET /users/profile` - Get user profile
- `POST /users/change-password` - Change password

### Usage
- `GET /usage` - Get usage metrics
- `GET /subscription` - Get subscription info
- `POST /subscription/upgrade` - Upgrade tier

### Analytics
- `GET /analytics` - Get analytics data

### API Keys
- `GET /api-keys` - List API keys
- `POST /api-keys` - Generate new key
- `DELETE /api-keys/{id}` - Delete key

---

## 🛠 Common Tasks

### Add a New Protected Page
```typescript
// Create: src/app/newpage/page.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function NewPage() {
  return (
    <ProtectedRoute>
      <YourComponent />
    </ProtectedRoute>
  );
}
```

### Access User Info in Component
```typescript
'use client';

import { useAuth } from '@/context/AuthContext';

export default function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.name}!</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Call Backend API
```typescript
'use client';

import { apiClient } from '@/lib/api';

export default function MyComponent() {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getUsage();
        console.log(data);
      } catch (error) {
        console.error('Failed:', error);
      }
    };
    
    fetchData();
  }, []);
}
```

---

## 📊 Current Features

### ✅ Phase 1: Authentication
- [x] User Registration
- [x] User Login
- [x] JWT Token Management
- [x] Protected Routes
- [x] Session Persistence
- [x] Error Handling
- [x] Form Validation

### ✅ Phase 2: Dashboard
- [x] Real API Data Integration
- [x] Usage Metrics Display
- [x] Platform Analytics
- [x] Time Range Filtering
- [x] Platform Filtering
- [x] Auto-Refresh (30s)
- [x] Loading States
- [x] Error Handling

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'react'"
**Solution**: Run `npm install`

### Issue: "API Connection Failed"
**Solution**: Backend not running. Frontend will use mock data instead.

### Issue: "Login redirect not working"
**Solution**: Check browser console for errors. Auth protection is client-side.

### Issue: Port 3000 in use
**Solution**: Frontend will use port 3001 automatically, or:
```bash
lsof -i :3000
kill -9 <PID>
```

### Issue: TypeScript errors
**Solution**: Run `npm run build` to see full errors, then check imports.

---

## 📚 Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production build
npm start

# Check for errors
npm run build

# Lint code
npx eslint src/
```

---

## 🚀 Deployment

### Deploy Frontend to Vercel
```bash
git push origin main
# Auto-deploys to Vercel
```

### Deploy Backend to AWS
```bash
docker build -t fortress-optimizer:latest .
# Push to ECR and deploy to ECS
```

---

## 📖 Documentation

- `PHASE_1_2_SUMMARY.md` - Executive summary
- `PHASE_1_2_COMPLETE.md` - Detailed implementation guide
- `PHASE_2_PLAN.md` - Phase 2 technical details
- `website/test-phase1.sh` - Testing script

---

## 🎯 Next Steps

### Phase 3 (Recommended)
- [ ] Settings page
- [ ] API key management UI
- [ ] Billing/subscription management
- [ ] Password reset
- [ ] Email verification

### Production Readiness
- [ ] Switch to PostgreSQL
- [ ] Add Stripe integration
- [ ] Setup email service
- [ ] Add monitoring/logging
- [ ] Performance optimization
- [ ] Security audit

---

## 📞 Support

For issues or questions:
1. Check the documentation in `/website/PHASE_1_2_COMPLETE.md`
2. Review error messages in browser console
3. Check API response in network tab
4. Run build to see TypeScript errors

---

## 🎉 Status

✅ **Phase 1**: Complete
✅ **Phase 2**: Complete
✅ **Tests**: All passing
✅ **Build**: Successful
✅ **GitHub**: All pushed

**Ready to**: Deploy to Vercel & AWS

---

**Last Updated**: January 1, 2025
**Dev Server**: http://localhost:3000
**Backend API**: http://localhost:8000
