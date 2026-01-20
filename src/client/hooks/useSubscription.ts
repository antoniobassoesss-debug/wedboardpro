/**
 * useSubscription Hook
 * 
 * React hook for managing subscription state and feature gating.
 * Provides easy access to subscription status, plan limits, and feature flags.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchMySubscription,
  fetchSubscriptionPlans,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionResponse,
  isSubscriptionActive,
  getTrialDaysRemaining,
} from '../api/subscriptionsApi';

export interface UseSubscriptionResult {
  // Loading state
  loading: boolean;
  error: string | null;
  
  // Subscription data
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  plans: SubscriptionPlan[];
  teamId: string | null;
  memberCount: number;
  
  // Status helpers
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  trialDaysRemaining: number | null;
  
  // Feature access
  hasFeature: (feature: FeatureKey) => boolean;
  canAddTeamMember: () => boolean;
  canAddEvent: () => boolean;
  
  // Plan limits
  maxTeamMembers: number;
  maxEvents: number | null;
  maxStorageGb: number;
  
  // Actions
  refresh: () => Promise<void>;
}

export type FeatureKey = 
  | 'advanced_reports'
  | 'custom_branding'
  | 'api_access'
  | 'priority_support'
  | 'layout_maker'
  | 'budget_tools'
  | 'guest_management'
  | 'quote_maker'
  | 'vendor_management';

// Default limits for users without a subscription
const DEFAULT_LIMITS = {
  maxTeamMembers: 1,
  maxEvents: 3,
  maxStorageGb: 1,
};

export function useSubscription(): UseSubscriptionResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Fetch subscription data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch plans first (available to everyone)
      const fetchedPlans = await fetchSubscriptionPlans();
      setPlans(fetchedPlans);
      
      // Check if user is authenticated
      const session = localStorage.getItem('wedboarpro_session');
      if (!session) {
        setSubscriptionData(null);
        return;
      }
      
      // Fetch user's subscription
      const data = await fetchMySubscription();
      setSubscriptionData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get the current plan details
  const currentPlan = useMemo(() => {
    if (!subscriptionData?.subscription?.plan?.name) return null;
    return plans.find(p => p.name === subscriptionData.subscription?.plan?.name) || null;
  }, [subscriptionData, plans]);

  // Status helpers
  const subscription = subscriptionData?.subscription || null;
  const isActive = isSubscriptionActive(subscription);
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';
  const trialDaysRemaining = getTrialDaysRemaining(subscription);

  // Plan limits
  const maxTeamMembers = currentPlan?.maxTeamMembers ?? DEFAULT_LIMITS.maxTeamMembers;
  const maxEvents = currentPlan?.maxEvents ?? DEFAULT_LIMITS.maxEvents;
  const maxStorageGb = currentPlan?.maxStorageGb ?? DEFAULT_LIMITS.maxStorageGb;

  // Feature access checker
  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    // If no active subscription, only basic features
    if (!isActive || !currentPlan) {
      return ['layout_maker', 'budget_tools', 'guest_management'].includes(feature);
    }

    switch (feature) {
      case 'advanced_reports':
        return currentPlan.hasAdvancedReports;
      case 'custom_branding':
        return currentPlan.hasCustomBranding;
      case 'api_access':
        return currentPlan.hasApiAccess;
      case 'priority_support':
        return currentPlan.hasPrioritySupport;
      case 'layout_maker':
        return currentPlan.hasLayoutMaker;
      case 'budget_tools':
        return currentPlan.hasBudgetTools;
      case 'guest_management':
        return currentPlan.hasGuestManagement;
      case 'quote_maker':
      case 'vendor_management':
        // These are available in Professional and Enterprise
        return currentPlan.name !== 'starter';
      default:
        return false;
    }
  }, [isActive, currentPlan]);

  // Check if can add team member
  const canAddTeamMember = useCallback((): boolean => {
    if (!isActive) return false;
    const memberCount = subscriptionData?.memberCount || 0;
    return memberCount < maxTeamMembers;
  }, [isActive, subscriptionData?.memberCount, maxTeamMembers]);

  // Check if can add event (would need event count from elsewhere)
  const canAddEvent = useCallback((): boolean => {
    if (!isActive) return false;
    if (maxEvents === null) return true; // Unlimited
    // Note: Actual event count check would need to be implemented
    // This is a placeholder that returns true for unlimited plans
    return true;
  }, [isActive, maxEvents]);

  return {
    loading,
    error,
    subscription,
    plan: currentPlan,
    plans,
    teamId: subscriptionData?.teamId || null,
    memberCount: subscriptionData?.memberCount || 0,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    trialDaysRemaining,
    hasFeature,
    canAddTeamMember,
    canAddEvent,
    maxTeamMembers,
    maxEvents,
    maxStorageGb,
    refresh: fetchData,
  };
}

/**
 * Feature gate component helper
 * Renders children only if user has the required feature
 */
export function useFeatureGate(feature: FeatureKey): {
  hasAccess: boolean;
  loading: boolean;
  showUpgradePrompt: () => void;
} {
  const { hasFeature, loading, isActive } = useSubscription();
  
  const hasAccess = hasFeature(feature);
  
  const showUpgradePrompt = useCallback(() => {
    // Could dispatch an event or open a modal
    window.dispatchEvent(new CustomEvent('show-upgrade-prompt', { 
      detail: { feature, requiredFor: feature } 
    }));
  }, [feature]);

  return {
    hasAccess,
    loading,
    showUpgradePrompt,
  };
}

export default useSubscription;

