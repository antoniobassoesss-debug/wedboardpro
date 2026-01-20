/**
 * Subscriptions API Client
 * 
 * Frontend API client for subscription and payment management.
 */

const API_BASE = '/api';

// Get auth token from localStorage
function getAuthHeaders(): HeadersInit {
  const sessionStr = localStorage.getItem('wedboarpro_session');
  if (!sessionStr) return { 'Content-Type': 'application/json' };
  
  try {
    const session = JSON.parse(sessionStr);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

// Types
export interface SubscriptionPlan {
  id: string;
  name: 'starter' | 'professional' | 'enterprise';
  displayName: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualMonthlyEquivalent: number;
  annualSavingsPercent: number;
  maxTeamMembers: number;
  maxEvents: number | null;
  maxStorageGb: number;
  additionalUserPrice: number;
  features: string[];
  hasAdvancedReports: boolean;
  hasCustomBranding: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  hasLayoutMaker: boolean;
  hasBudgetTools: boolean;
  hasGuestManagement: boolean;
}

export interface Subscription {
  id: string;
  status: 'incomplete' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  billingInterval: 'month' | 'year';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  plan: {
    id: string;
    name: string;
    displayName: string;
    maxTeamMembers: number;
    maxEvents: number | null;
  } | null;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  teamId: string | null;
  memberCount: number;
  addons: any[];
  status: string;
  message?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface StripeConfig {
  publishableKey: string | null;
  stripeEnabled: boolean;
}

// API Functions

/**
 * Fetch all available subscription plans
 */
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await fetch(`${API_BASE}/subscriptions/plans`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch subscription plans');
  }
  
  const data = await response.json();
  return data.plans;
}

/**
 * Fetch current user's team subscription
 */
export async function fetchMySubscription(): Promise<SubscriptionResponse> {
  const response = await fetch(`${API_BASE}/subscriptions/my-subscription`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch subscription');
  }
  
  return response.json();
}

/**
 * Create a Stripe Checkout session for a new subscription
 */
export async function createCheckoutSession(
  planId: string, 
  billingInterval: 'month' | 'year' = 'month'
): Promise<CheckoutSessionResponse> {
  const response = await fetch(`${API_BASE}/subscriptions/create-checkout-session`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ planId, billingInterval }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }
  
  return response.json();
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(): Promise<PortalSessionResponse> {
  const response = await fetch(`${API_BASE}/subscriptions/create-portal-session`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create portal session');
  }
  
  return response.json();
}

/**
 * Fetch Stripe configuration (publishable key)
 */
export async function fetchStripeConfig(): Promise<StripeConfig> {
  const response = await fetch(`${API_BASE}/subscriptions/config`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch Stripe config');
  }
  
  return response.json();
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(planId: string, billingInterval: 'month' | 'year' = 'month'): Promise<void> {
  const { url } = await createCheckoutSession(planId, billingInterval);
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned');
  }
}

/**
 * Redirect to Stripe Customer Portal
 */
export async function redirectToCustomerPortal(): Promise<void> {
  const { url } = await createPortalSession();
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No portal URL returned');
  }
}

/**
 * Check if a subscription is active (includes trialing)
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return ['active', 'trialing'].includes(subscription.status);
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: Subscription | null): number | null {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trialEnd) {
    return null;
  }
  
  const trialEnd = new Date(subscription.trialEnd);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

