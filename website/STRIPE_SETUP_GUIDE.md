# Stripe Payment Integration Setup Guide

## Overview
Complete Stripe payment integration for subscription management with webhook support and database synchronization.

## Components Installed ✅

### Packages
- `stripe` - Server-side SDK
- `@stripe/react-stripe-js` - React library
- `@stripe/stripe-js` - Client-side JS library

### Files Created
1. **`src/lib/stripe.ts`** - Stripe utility functions
   - `createCheckoutSession()` - Create Stripe checkout
   - `getCustomerSubscription()` - Fetch customer subscription
   - `cancelSubscription()` - Cancel active subscription
   - `verifyWebhookSignature()` - Validate webhooks

2. **`src/app/api/subscriptions/route.ts`** - Subscription API (updated)
   - `GET /api/subscriptions` - Get user's subscription
   - `POST /api/subscriptions` - Create checkout session

3. **`src/app/api/webhook/stripe/route.ts`** - Webhook handler
   - Handles: `checkout.session.completed`
   - Handles: `customer.subscription.updated`
   - Handles: `customer.subscription.deleted`
   - Handles: `invoice.payment_failed`

4. **`src/components/stripe-checkout.tsx`** - Pricing UI
   - Displays pricing tiers
   - Initiates checkout flow
   - Shows current plan status

5. **Database migration** - Added fields to User model
   - `tier` - Current subscription tier
   - `subscriptionStatus` - active/cancelled/suspended
   - `stripeCustomerId` - Stripe customer ID
   - `stripeSubscriptionId` - Stripe subscription ID

## Setup Steps

### 1. Stripe Account Setup (30 minutes)
1. Sign up at https://stripe.com
2. Go to Dashboard → API keys
3. Copy your keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Create Products in Stripe Dashboard
1. Go to Products → Create product
2. Create 3 products:
   - **Starter** - $29/month
   - **Growth** - $99/month
   - **Enterprise** - $299/month
3. Copy the Product IDs (start with `prod_`)

### 3. Webhook Setup
1. Go to Webhooks → Add endpoint
2. Endpoint URL: `https://your-domain.com/api/webhook/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the Signing Secret (starts with `whsec_`)

### 4. Environment Variables
Add to `.env.production` or Vercel dashboard:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_key_here

STRIPE_PRODUCT_ID_STARTER=prod_starter_id
STRIPE_PRODUCT_ID_GROWTH=prod_growth_id
STRIPE_PRODUCT_ID_ENTERPRISE=prod_enterprise_id
```

### 5. Deploy Updates
```bash
npm run build
git add .
git commit -m "feat: add stripe payment integration"
git push origin main
```

## Usage

### Display Pricing Component
```tsx
import StripeCheckout from '@/components/stripe-checkout';

export default function PricingPage() {
  return (
    <StripeCheckout
      userId={user.id}
      currentTier={user.tier}
      onCheckoutStart={() => console.log('Checkout started')}
      onCheckoutError={(error) => console.error(error)}
    />
  );
}
```

### Get User Subscription
```typescript
// Server-side
const subscription = await prisma.user.findUnique({
  where: { id: userId },
  select: { tier, subscriptionStatus, stripeCustomerId }
});

// Client-side
const response = await fetch('/api/subscriptions', {
  headers: { 'x-user-id': userId }
});
const subscription = await response.json();
```

### Create Checkout Session
```typescript
const response = await fetch('/api/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId
  },
  body: JSON.stringify({
    tier: 'growth',
    successUrl: 'https://example.com/dashboard',
    cancelUrl: 'https://example.com/pricing'
  })
});

const { sessionId } = await response.json();
// Redirect to Stripe checkout
```

## Testing

### Test with Stripe Test Keys
Use Stripe test cards for testing:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Expiry: Any future date
CVC: Any 3 digits

### Test Webhook Locally
```bash
npm install -g stripe
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Copy the signing secret and set `STRIPE_WEBHOOK_SECRET`.

## Production Checklist

- [ ] Switch to Live API Keys
- [ ] Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_)
- [ ] Update `STRIPE_SECRET_KEY` (sk_live_)
- [ ] Update webhook endpoint URL to production domain
- [ ] Copy new webhook signing secret
- [ ] Test with real Stripe account
- [ ] Monitor webhook deliveries in Stripe Dashboard
- [ ] Set up email notifications for failed payments
- [ ] Add customer support documentation

## API Reference

### POST /api/subscriptions
Create a checkout session

**Headers:**
- `x-user-id`: User ID (required)
- `Content-Type`: application/json

**Body:**
```json
{
  "tier": "growth",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/pricing"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/..."
}
```

### GET /api/subscriptions
Get current user subscription

**Headers:**
- `x-user-id`: User ID (required)

**Response:**
```json
{
  "id": "sub_...",
  "tier": "growth",
  "status": "active",
  "currentPeriodStart": 1708166400000,
  "currentPeriodEnd": 1710844800000,
  "cancelAtPeriodEnd": false,
  "features": ["100 optimization requests/month", ...],
  "stripeCustomerId": "cus_..."
}
```

### POST /api/webhook/stripe
Webhook endpoint (called by Stripe)

**Headers:**
- `stripe-signature`: Webhook signature (validated)

**Body:** Raw Stripe event

## Troubleshooting

### "STRIPE_WEBHOOK_SECRET not configured"
- Check environment variables are set correctly
- Verify webhook secret from Stripe Dashboard
- Restart Next.js server after adding env vars

### "Failed to create checkout session"
- Verify Stripe API keys are correct
- Check product IDs exist in Stripe
- Ensure user has valid email address

### Webhook events not processing
- Check webhook endpoint is publicly accessible
- Verify signing secret is correct
- Check server logs for webhook errors
- Use `stripe logs` CLI to debug

### Customer not created in Stripe
- Check user email is valid
- Verify API key permissions
- Check for duplicate customer creation

## Support
- Stripe Docs: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Dashboard: https://dashboard.stripe.com
