# Stripe Payment Integration Setup Guide

This guide walks you through setting up Stripe payments for WedBoardPro.

## Overview

The integration includes:
- **3 Subscription Plans**: Starter (€29/mo), Professional (€59/mo), Enterprise (€149/mo)
- **Billing Options**: Monthly and Annual (17% discount)
- **Free Trial**: 14-day trial for all plans
- **Stripe Checkout**: For new subscriptions from pricing page
- **Customer Portal**: For managing existing subscriptions
- **Webhooks**: Automatic subscription status updates

## Step 1: Create a Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in
3. Complete account verification if needed

## Step 2: Get Your API Keys

1. In Stripe Dashboard, go to **Developers → API Keys**
2. Copy both keys:
   - **Publishable key**: `pk_test_...` (for frontend)
   - **Secret key**: `sk_test_...` (for backend)

3. Add to your `.env.local` file:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Step 3: Create Products and Prices in Stripe

### Option A: Via Stripe Dashboard (Recommended)

1. Go to **Products** in Stripe Dashboard
2. Create 3 products with these names:
   - **Starter**
   - **Professional**
   - **Enterprise**

3. For each product, create 2 prices:
   - **Monthly**: Recurring, charged monthly
   - **Annual**: Recurring, charged yearly

4. Use these suggested prices (adjust as needed):

| Plan | Monthly | Annual |
|------|---------|--------|
| Starter | €29.00 | €290.00 |
| Professional | €59.00 | €590.00 |
| Enterprise | €149.00 | €1,490.00 |

5. Copy each Price ID (starts with `price_...`)

### Option B: Via Stripe CLI

```bash
# Create Starter product and prices
stripe products create --name="Starter" --description="Perfect for solo planners"
stripe prices create --product=prod_XXX --unit-amount=2900 --currency=eur --recurring[interval]=month
stripe prices create --product=prod_XXX --unit-amount=29000 --currency=eur --recurring[interval]=year

# Create Professional product and prices
stripe products create --name="Professional" --description="For growing studios"
stripe prices create --product=prod_XXX --unit-amount=5900 --currency=eur --recurring[interval]=month
stripe prices create --product=prod_XXX --unit-amount=59000 --currency=eur --recurring[interval]=year

# Create Enterprise product and prices
stripe products create --name="Enterprise" --description="For large agencies"
stripe prices create --product=prod_XXX --unit-amount=14900 --currency=eur --recurring[interval]=month
stripe prices create --product=prod_XXX --unit-amount=149000 --currency=eur --recurring[interval]=year
```

## Step 4: Update Database with Price IDs

After running the SQL migration (`supabase_subscription_schema.sql`), update the plans with your Stripe Price IDs:

```sql
-- Update Starter plan
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_STARTER_PRODUCT_ID',
  stripe_price_id_monthly = 'price_YOUR_STARTER_MONTHLY_PRICE_ID',
  stripe_price_id_annual = 'price_YOUR_STARTER_ANNUAL_PRICE_ID'
WHERE name = 'starter';

-- Update Professional plan
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_PROFESSIONAL_PRODUCT_ID',
  stripe_price_id_monthly = 'price_YOUR_PROFESSIONAL_MONTHLY_PRICE_ID',
  stripe_price_id_annual = 'price_YOUR_PROFESSIONAL_ANNUAL_PRICE_ID'
WHERE name = 'professional';

-- Update Enterprise plan
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_ENTERPRISE_PRODUCT_ID',
  stripe_price_id_monthly = 'price_YOUR_ENTERPRISE_MONTHLY_PRICE_ID',
  stripe_price_id_annual = 'price_YOUR_ENTERPRISE_ANNUAL_PRICE_ID'
WHERE name = 'enterprise';
```

## Step 5: Configure Webhooks

### For Development (Local Testing)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
4. Copy the webhook signing secret (`whsec_...`) and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### For Production

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the signing secret and add to your production environment

## Step 6: Configure Customer Portal

1. In Stripe Dashboard, go to **Settings → Billing → Customer portal**
2. Enable the portal
3. Configure allowed actions:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to view invoice history
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to switch plans (optional)
4. Customize branding if desired

## Step 7: Run the Database Migration

In Supabase SQL Editor, run the contents of `supabase_subscription_schema.sql`:

```sql
-- Copy and paste the entire contents of supabase_subscription_schema.sql
```

This creates:
- `subscription_plans` table with seeded plan data
- `team_subscriptions` table for active subscriptions
- `subscription_addons` table for per-user add-ons
- `subscription_payments` table for payment history
- Updates `teams` table with subscription columns
- RLS policies for security
- Helper functions

## Step 8: Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `/pricing` to see the pricing page

3. Click "Start Free Trial" on any plan

4. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any postal code

5. Complete the checkout flow

6. Check that:
   - Webhook events are received (check terminal/logs)
   - Subscription appears in database
   - Dashboard shows subscription status

## Test Card Numbers

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 3220 | 3D Secure required |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 9995 | Insufficient funds |

## Environment Variables Summary

```bash
# .env.local

# Stripe (Required)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional: Base URL for redirects (defaults to localhost:5173 in dev)
BASE_URL=http://localhost:5173
```

## File Structure

```
src/
├── stripeClient.ts           # Stripe client initialization
├── app.ts                    # Backend endpoints (search for "SUBSCRIPTION")
│   ├── GET /api/subscriptions/plans
│   ├── GET /api/subscriptions/my-subscription
│   ├── POST /api/subscriptions/create-checkout-session
│   ├── POST /api/subscriptions/create-portal-session
│   ├── GET /api/subscriptions/config
│   └── POST /api/webhooks/stripe
├── client/
│   ├── PricingPage.tsx       # Full pricing page
│   ├── pricing-page.css
│   ├── api/
│   │   └── subscriptionsApi.ts   # Frontend API client
│   ├── hooks/
│   │   └── useSubscription.ts    # Subscription hook
│   └── dashboard/
│       ├── SubscriptionTab.tsx   # Subscription management UI
│       └── subscription-tab.css

supabase_subscription_schema.sql  # Database schema
```

## Troubleshooting

### "Stripe not configured" error
- Check that `STRIPE_SECRET_KEY` is set in `.env.local`
- Restart the server after adding environment variables

### Checkout session fails
- Verify Stripe Price IDs are set in `subscription_plans` table
- Check browser console and server logs for errors

### Webhook events not received
- In development: Ensure `stripe listen` is running
- In production: Verify webhook URL and signing secret

### Subscription not updating after payment
- Check webhook endpoint is receiving events
- Verify webhook signature is correct
- Check server logs for database errors

## Going Live

1. Switch to live API keys in production environment
2. Create products/prices in live mode
3. Update webhook endpoint for production URL
4. Test with real card (small amount, refund after)
5. Enable invoice emails in Stripe settings

## Support

For Stripe-specific issues, see:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)

