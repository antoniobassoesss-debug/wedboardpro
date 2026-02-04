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

// Plan limits interface matching the backend JSONB structure
export interface PlanLimits {
  events?: { maxActive?: number };
  team?: { maxMembers?: number; canInvite?: boolean };
  contacts?: { teamShared?: boolean };
  suppliers?: { teamShared?: boolean };
  tasks?: { maxPerEvent?: number; assignment?: boolean };
  chat?: { enabled?: boolean };
  crm?: { maxDeals?: number };
}

// Default limits for Starter plan (fallback)
const STARTER_LIMITS: PlanLimits = {
  events: { maxActive: 8 },
  team: { maxMembers: 1, canInvite: true },
  contacts: { teamShared: false },
  suppliers: { teamShared: false },
  tasks: { maxPerEvent: 30, assignment: false },
  chat: { enabled: false },
  crm: { maxDeals: 150 },
};

const PROFESSIONAL_LIMITS: PlanLimits = {
  events: { maxActive: 30 },
  team: { maxMembers: 8, canInvite: true },
  contacts: { teamShared: true },
  suppliers: { teamShared: true },
  tasks: { maxPerEvent: 150, assignment: true },
  chat: { enabled: true },
  crm: { maxDeals: 1000 },
};

const ENTERPRISE_LIMITS: PlanLimits = {
  events: { maxActive: -1 }, // unlimited
  team: { maxMembers: 25, canInvite: true },
  contacts: { teamShared: true },
  suppliers: { teamShared: true },
  tasks: { maxPerEvent: -1, assignment: true },
  chat: { enabled: true },
  crm: { maxDeals: -1 },
};

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
  planName: string;
  
  // Status helpers
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  trialDaysRemaining: number | null;
  
  // Feature access
  hasFeature: (feature: FeatureKey) => boolean;
  canAddTeamMember: () => boolean;
  canAddEvent: (currentEventCount?: number) => boolean;
  canShareWithTeam: () => boolean;
  canAssignTask: () => boolean;
  canUseChat: () => boolean;
  canAddDeal: (currentDealCount?: number) => boolean;
  canAddTaskToEvent: (currentTaskCount?: number) => boolean;
  
  // Plan limits
  maxTeamMembers: number;
  maxEvents: number | null;
  maxStorageGb: number;
  limits: PlanLimits;
  
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
  | 'vendor_management'
  | 'team_sharing'
  | 'task_assignment'
  | 'team_chat';

// Default limits for users without a subscription
const DEFAULT_LIMITS = {
  maxTeamMembers: 1,
  maxEvents: 8,
  maxStorageGb: 5,
};

function getPlanLimits(planName: string): PlanLimits {
  switch (planName) {
    case 'enterprise':
      return ENTERPRISE_LIMITS;
    case 'professional':
      return PROFESSIONAL_LIMITS;
    case 'starter':
    default:
      return STARTER_LIMITS;
  }
}

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
  
  // Plan name for display and limit lookup
  const planName = currentPlan?.name || 'starter';
  
  // Get limits based on plan
  const limits = useMemo(() => getPlanLimits(planName), [planName]);

  // Plan limits
  const maxTeamMembers = limits.team?.maxMembers ?? DEFAULT_LIMITS.maxTeamMembers;
  const maxEvents = limits.events?.maxActive === -1 ? null : (limits.events?.maxActive ?? DEFAULT_LIMITS.maxEvents);
  const maxStorageGb = currentPlan?.maxStorageGb ?? DEFAULT_LIMITS.maxStorageGb;

  // Feature access checker
  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    // Special handling for new feature flags
    switch (feature) {
      case 'team_sharing':
        return limits.contacts?.teamShared ?? false;
      case 'task_assignment':
        return limits.tasks?.assignment ?? false;
      case 'team_chat':
        return limits.chat?.enabled ?? false;
    }
    
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
  }, [isActive, currentPlan, limits]);

  // Check if can add team member
  const canAddTeamMember = useCallback((): boolean => {
    const memberCount = subscriptionData?.memberCount || 0;
    return memberCount < maxTeamMembers;
  }, [subscriptionData?.memberCount, maxTeamMembers]);

  // Check if can add event
  const canAddEvent = useCallback((currentEventCount?: number): boolean => {
    if (maxEvents === null) return true; // Unlimited
    if (currentEventCount === undefined) return true; // No count provided, allow (backend will check)
    return currentEventCount < maxEvents;
  }, [maxEvents]);

  // Check if can share contacts/suppliers with team
  const canShareWithTeam = useCallback((): boolean => {
    return limits.contacts?.teamShared ?? false;
  }, [limits]);

  // Check if can assign tasks to team members
  const canAssignTask = useCallback((): boolean => {
    return limits.tasks?.assignment ?? false;
  }, [limits]);

  // Check if can use team chat
  const canUseChat = useCallback((): boolean => {
    return limits.chat?.enabled ?? false;
  }, [limits]);

  // Check if can add more CRM deals
  const canAddDeal = useCallback((currentDealCount?: number): boolean => {
    const maxDeals = limits.crm?.maxDeals ?? 150;
    if (maxDeals === -1) return true; // Unlimited
    if (currentDealCount === undefined) return true; // No count provided
    return currentDealCount < maxDeals;
  }, [limits]);

  // Check if can add more tasks to an event
  const canAddTaskToEvent = useCallback((currentTaskCount?: number): boolean => {
    const maxTasks = limits.tasks?.maxPerEvent ?? 30;
    if (maxTasks === -1) return true; // Unlimited
    if (currentTaskCount === undefined) return true; // No count provided
    return currentTaskCount < maxTasks;
  }, [limits]);

  return {
    loading,
    error,
    subscription,
    plan: currentPlan,
    plans,
    teamId: subscriptionData?.teamId || null,
    memberCount: subscriptionData?.memberCount || 0,
    planName,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    trialDaysRemaining,
    hasFeature,
    canAddTeamMember,
    canAddEvent,
    canShareWithTeam,
    canAssignTask,
    canUseChat,
    canAddDeal,
    canAddTaskToEvent,
    maxTeamMembers,
    maxEvents,
    maxStorageGb,
    limits,
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
  const { hasFeature, loading, planName } = useSubscription();
  
  const hasAccess = hasFeature(feature);
  
  const showUpgradePrompt = useCallback(() => {
    // Dispatch event to show upgrade modal
    window.dispatchEvent(new CustomEvent('show-upgrade-prompt', { 
      detail: { 
        feature, 
        currentPlan: planName,
        requiredPlan: planName === 'starter' ? 'professional' : 'enterprise',
      } 
    }));
  }, [feature, planName]);

  return {
    hasAccess,
    loading,
    showUpgradePrompt,
  };
}

export default useSubscription;
