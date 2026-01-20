/**
 * Stripe Client Configuration
 * 
 * This module initializes and exports the Stripe client for server-side operations.
 * 
 * Required Environment Variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_...)
 * - STRIPE_PUBLISHABLE_KEY: (Optional) For sending to frontend
 */

import Stripe from 'stripe';

// Validate required environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('[Stripe] WARNING: STRIPE_SECRET_KEY not found in environment variables. Stripe features will be disabled.');
}

// Initialize Stripe client
const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      appInfo: {
        name: 'WedBoardPro',
        version: '1.0.0',
      },
    })
  : null;

// Export the Stripe client
export const getStripeClient = (): Stripe | null => stripe;

// Export webhook secret for verification
export const getStripeWebhookSecret = (): string | undefined => {
  return process.env.STRIPE_WEBHOOK_SECRET;
};

// Export publishable key for frontend
export const getStripePublishableKey = (): string | undefined => {
  return process.env.STRIPE_PUBLISHABLE_KEY;
};

// Helper to check if Stripe is configured
export const isStripeConfigured = (): boolean => {
  return stripe !== null;
};

// Type exports for convenience
export type { Stripe };

// Stripe event types we handle
export const HANDLED_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.created',
  'customer.updated',
] as const;

export type HandledWebhookEvent = typeof HANDLED_WEBHOOK_EVENTS[number];

// Subscription status mapping
export const STRIPE_STATUS_TO_APP_STATUS: Record<Stripe.Subscription.Status, string> = {
  'incomplete': 'incomplete',
  'incomplete_expired': 'expired',
  'trialing': 'trialing',
  'active': 'active',
  'past_due': 'past_due',
  'canceled': 'canceled',
  'unpaid': 'expired',
  'paused': 'paused',
};

// Helper to format currency amounts
export const formatCurrency = (amountCents: number, currency: string = 'eur'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
};

// Helper to get billing interval display text
export const getBillingIntervalText = (interval: 'month' | 'year'): string => {
  return interval === 'month' ? 'monthly' : 'annually';
};

export default stripe;

