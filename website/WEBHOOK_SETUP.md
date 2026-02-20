# Stripe Webhook Setup Guide

## Step 1: Add Webhook Endpoint

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your endpoint URL:
   ```
   https://website-theta-two-42.vercel.app/api/webhook/stripe
   ```

4. Select the events you want to receive:
   - ✓ `checkout.session.completed`
   - ✓ `customer.subscription.updated`
   - ✓ `customer.subscription.deleted`
   - ✓ `invoice.payment_failed`

5. Click **"Add endpoint"**
6. You'll see your webhook signing secret (starts with `whsec_`)
7. Copy the signing secret and add it to your environment:
   - Local: Add to `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...`
   - Production: Add to Vercel in Settings → Environment Variables

## Step 2: Test the Webhook

Once the webhook is created, you can:

1. **Test with the Stripe Dashboard:**
   - In Webhooks, click your endpoint
   - Click "Send test event"
   - Select `checkout.session.completed`
   - Click "Send test event"
   - Check the response

2. **View webhook logs:**
   - In Webhooks, click your endpoint
   - Scroll to "Events" to see all webhook attempts
   - Click an event to see the payload and response

3. **Verify webhook was received:**
   - Check your application logs
   - Query the database to see if subscription was created

## Webhook Payload Example

When a customer completes checkout, Stripe sends this event:
```json
{
  "id": "evt_...",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "object": "checkout.session",
      "customer": "cus_...",
      "customer_email": "user@example.com",
      "metadata": {
        "userId": "user-id-from-db",
        "tier": "individual"
      },
      "subscription": "sub_...",
      "payment_status": "paid"
    }
  }
}
```

Our webhook handler (`/api/webhook/stripe`) will:
1. Verify the Stripe signature
2. Extract the subscription information
3. Update the user's tier in the database
4. Save the subscription IDs for future reference

## Troubleshooting

If webhook isn't working:
1. Check that `STRIPE_WEBHOOK_SECRET` is set in production
2. Look at webhook logs in Stripe Dashboard
3. Check application error logs
4. Verify endpoint URL is correct and accessible
