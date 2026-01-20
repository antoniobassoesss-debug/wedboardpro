/**
 * UsageTab - Usage and Limits display component
 * 
 * Shows current usage statistics like team members, events, and storage.
 */
import React, { useState, useEffect } from 'react';
import {
  fetchMySubscription,
  fetchSubscriptionPlans,
  type SubscriptionPlan,
  type SubscriptionResponse,
} from '../api/subscriptionsApi';
import './usage-tab.css';

const UsageTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [subData, plansData] = await Promise.all([
          fetchMySubscription(),
          fetchSubscriptionPlans(),
        ]);
        setSubscription(subData);
        
        // Find the current plan
        const plan = plansData.find(p => p.name === subData?.subscription?.plan?.name);
        setCurrentPlan(plan || null);
      } catch (e) {
        console.error('Failed to load usage data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="usage-tab">
        <div className="usage-loading">
          <div className="usage-spinner" />
          <p>Loading usage data...</p>
        </div>
      </div>
    );
  }

  const memberCount = subscription?.memberCount || 0;
  const maxMembers = currentPlan?.maxTeamMembers || 0;
  const memberPercentage = maxMembers > 0 ? Math.min(100, (memberCount / maxMembers) * 100) : 0;

  return (
    <div className="usage-tab">
      <div className="usage-header">
        <h3>Usage & Limits</h3>
        <p>Monitor your current resource usage</p>
      </div>

      <div className="usage-grid">
        {/* Team Members */}
        <div className="usage-card">
          <div className="usage-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="usage-card-content">
            <div className="usage-card-label">Team Members</div>
            <div className="usage-card-value">
              {memberCount}
              <span className="usage-card-limit">/ {maxMembers || '—'}</span>
            </div>
            <div className="usage-card-bar">
              <div 
                className="usage-card-bar-fill"
                style={{ width: `${memberPercentage}%` }}
              />
            </div>
            <div className="usage-card-hint">
              {maxMembers - memberCount > 0 
                ? `${maxMembers - memberCount} slots available`
                : maxMembers > 0 ? 'Limit reached' : 'Upgrade for more'
              }
            </div>
          </div>
        </div>

        {/* Active Events */}
        <div className="usage-card">
          <div className="usage-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="usage-card-content">
            <div className="usage-card-label">Active Events</div>
            <div className="usage-card-value">
              —
              <span className="usage-card-limit">/ {currentPlan?.maxEvents || 'Unlimited'}</span>
            </div>
            <div className="usage-card-bar">
              <div className="usage-card-bar-fill" style={{ width: '0%' }} />
            </div>
            <div className="usage-card-hint">Coming soon</div>
          </div>
        </div>

        {/* Storage */}
        <div className="usage-card">
          <div className="usage-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div className="usage-card-content">
            <div className="usage-card-label">Storage</div>
            <div className="usage-card-value">
              —
              <span className="usage-card-limit">/ {currentPlan?.maxStorageGb || '—'} GB</span>
            </div>
            <div className="usage-card-bar">
              <div className="usage-card-bar-fill" style={{ width: '0%' }} />
            </div>
            <div className="usage-card-hint">Coming soon</div>
          </div>
        </div>
      </div>

      {!currentPlan && (
        <div className="usage-no-plan">
          <p>Subscribe to a plan to unlock usage limits and features.</p>
        </div>
      )}
    </div>
  );
};

export default UsageTab;

