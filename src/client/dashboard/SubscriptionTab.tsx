/**
 * SubscriptionTab - Subscription management component for the dashboard
 * 
 * Displays current subscription status, plan details, and management options.
 * Can be used in AccountModal or as a standalone component.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMySubscription,
  fetchSubscriptionPlans,
  redirectToCheckout,
  redirectToCustomerPortal,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionResponse,
  formatPrice,
  isSubscriptionActive,
  getTrialDaysRemaining,
} from '../api/subscriptionsApi';
import './subscription-tab.css';

interface SubscriptionTabProps {
  onClose?: () => void;
}

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [subData, plansData] = await Promise.all([
          fetchMySubscription(),
          fetchSubscriptionPlans(),
        ]);
        setSubscription(subData);
        setPlans(plansData);
      } catch (e: any) {
        setError(e.message || 'Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    try {
      setProcessingAction(`upgrade-${plan.id}`);
      await redirectToCheckout(plan.id, 'month');
    } catch (e: any) {
      setError(e.message || 'Failed to start upgrade');
      setProcessingAction(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      setProcessingAction('portal');
      await redirectToCustomerPortal();
    } catch (e: any) {
      setError(e.message || 'Failed to open billing portal');
      setProcessingAction(null);
    }
  };

  const handleViewPricing = () => {
    if (onClose) onClose();
    navigate('/pricing');
  };

  if (loading) {
    return (
      <div className="subscription-tab">
        <div className="subscription-loading">
          <div className="subscription-spinner" />
          <p>Loading subscription...</p>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.name === subscription?.subscription?.plan?.name);
  const isActive = isSubscriptionActive(subscription?.subscription || null);
  const isTrialing = subscription?.subscription?.status === 'trialing';
  const trialDays = getTrialDaysRemaining(subscription?.subscription || null);

  return (
    <div className="subscription-tab">
      {/* Error Banner */}
      {error && (
        <div className="subscription-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Current Plan Status */}
      <div className="subscription-status-card">
        <div className="subscription-status-header">
          <h3>Your Subscription</h3>
          {isActive && (
            <span className={`subscription-badge ${isTrialing ? 'trial' : 'active'}`}>
              {isTrialing ? 'Trial' : 'Active'}
            </span>
          )}
          {!isActive && subscription?.subscription && (
            <span className="subscription-badge inactive">
              {subscription.subscription.status}
            </span>
          )}
        </div>

        {subscription?.subscription && currentPlan ? (
          <div className="subscription-plan-info">
            <div className="subscription-plan-name">
              <span className="plan-label">{currentPlan.displayName}</span>
              <span className="plan-price">
                {formatPrice(currentPlan.monthlyPrice)}
                <span className="plan-interval">/month</span>
              </span>
            </div>

            {isTrialing && trialDays !== null && (
              <div className="subscription-trial-notice">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {trialDays} day{trialDays !== 1 ? 's' : ''} left in your trial
              </div>
            )}

            {subscription.subscription.cancelAtPeriodEnd && (
              <div className="subscription-cancel-notice">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Subscription will cancel at end of billing period
              </div>
            )}

            <div className="subscription-details">
              <div className="subscription-detail-item">
                <span className="detail-label">Billing Period</span>
                <span className="detail-value">Monthly</span>
              </div>
              <div className="subscription-detail-item">
                <span className="detail-label">Next Billing Date</span>
                <span className="detail-value">
                  {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              <div className="subscription-detail-item">
                <span className="detail-label">Team Members</span>
                <span className="detail-value">
                  {subscription.memberCount} / {currentPlan.maxTeamMembers}
                </span>
              </div>
            </div>

            <div className="subscription-actions">
              <button 
                className="subscription-btn-secondary"
                onClick={handleManageBilling}
                disabled={processingAction === 'portal'}
              >
                {processingAction === 'portal' ? 'Opening...' : 'Manage Billing'}
              </button>
              <button 
                className="subscription-btn-primary"
                onClick={handleViewPricing}
              >
                Change Plan
              </button>
            </div>
          </div>
        ) : (
          // No subscription
          <div className="subscription-no-plan">
            <div className="subscription-no-plan-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h4>No Active Subscription</h4>
            <p>Choose a plan to unlock all features and grow your wedding planning business.</p>
            <button 
              className="subscription-btn-primary"
              onClick={handleViewPricing}
            >
              View Plans
            </button>
          </div>
        )}
      </div>

      {/* Available Plans (for upgrade) */}
      {isActive && currentPlan && (
        <div className="subscription-upgrade-section">
          <h4>Available Upgrades</h4>
          <div className="subscription-plans-grid">
            {plans
              .filter(p => {
                // Show plans that are higher tier than current
                const tierOrder = ['starter', 'professional', 'enterprise'];
                return tierOrder.indexOf(p.name) > tierOrder.indexOf(currentPlan.name);
              })
              .map(plan => (
                <div key={plan.id} className="subscription-plan-card">
                  <div className="plan-card-header">
                    <span className="plan-card-name">{plan.displayName}</span>
                    <span className="plan-card-price">
                      {formatPrice(plan.monthlyPrice)}/mo
                    </span>
                  </div>
                  <ul className="plan-card-features">
                    {(plan.features as string[]).slice(0, 3).map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                  <button
                    className="subscription-btn-upgrade"
                    onClick={() => handleUpgrade(plan)}
                    disabled={!!processingAction}
                  >
                    {processingAction === `upgrade-${plan.id}` ? 'Processing...' : 'Upgrade'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default SubscriptionTab;

