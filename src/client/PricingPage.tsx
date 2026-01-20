/**
 * PricingPage - Full pricing page with plan comparison
 * 
 * Displays all subscription plans with feature comparison,
 * monthly/annual toggle, and Stripe Checkout integration.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchSubscriptionPlans,
  fetchMySubscription,
  redirectToCheckout,
  type SubscriptionPlan,
  type SubscriptionResponse,
  formatPrice,
  isSubscriptionActive,
} from './api/subscriptionsApi';
import './pricing-page.css';

// Plan highlights for each tier
const PLAN_HIGHLIGHTS: Record<string, { badge?: string; highlight: string }> = {
  starter: {
    highlight: 'Great for solo planners',
  },
  professional: {
    badge: 'Most Popular',
    highlight: 'For growing studios',
  },
  enterprise: {
    highlight: 'For large agencies',
  },
};

// Feature comparison matrix
const FEATURE_MATRIX: Array<{
  category: string;
  features: Array<{
    name: string;
    starter: boolean | string;
    professional: boolean | string;
    enterprise: boolean | string;
  }>;
}> = [
  {
    category: 'Core Features',
    features: [
      { name: 'Project Pipeline', starter: true, professional: true, enterprise: true },
      { name: 'Smart Calendar', starter: true, professional: true, enterprise: true },
      { name: 'Layout Maker', starter: true, professional: true, enterprise: true },
      { name: 'Budget Tracking', starter: 'Basic', professional: 'Advanced', enterprise: 'Advanced' },
      { name: 'Guest Management', starter: true, professional: true, enterprise: true },
    ],
  },
  {
    category: 'Limits',
    features: [
      { name: 'Active Events', starter: 'Up to 10', professional: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Team Members', starter: '2 included', professional: '5 included', enterprise: '15 included' },
      { name: 'Storage', starter: '5 GB', professional: '25 GB', enterprise: '100 GB' },
    ],
  },
  {
    category: 'Advanced Features',
    features: [
      { name: 'Quote Maker', starter: false, professional: true, enterprise: true },
      { name: 'Reports & Analytics', starter: false, professional: true, enterprise: true },
      { name: 'Vendor Management', starter: false, professional: true, enterprise: true },
      { name: 'Custom Templates', starter: false, professional: true, enterprise: true },
      { name: 'Custom Branding', starter: false, professional: false, enterprise: true },
      { name: 'API Access', starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Email Support', starter: true, professional: true, enterprise: true },
      { name: 'Priority Support', starter: false, professional: true, enterprise: true },
      { name: 'Phone & Video Support', starter: false, professional: false, enterprise: true },
      { name: 'Dedicated Account Manager', starter: false, professional: false, enterprise: true },
    ],
  },
];

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Enable scrolling on mount by overriding index.html inline styles
  useEffect(() => {
    // Store original values
    const rootEl = document.getElementById('root');
    const originalStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      htmlHeight: document.documentElement.style.height,
      bodyOverflow: document.body.style.overflow,
      bodyHeight: document.body.style.height,
      bodyTouchAction: document.body.style.touchAction,
      rootPosition: rootEl?.style.position || '',
      rootOverflow: rootEl?.style.overflow || '',
      rootHeight: rootEl?.style.height || '',
    };

    // Override inline styles from index.html to enable scrolling
    document.documentElement.style.cssText = 'overflow: auto !important; height: auto !important; min-height: 100vh;';
    document.body.style.cssText = 'overflow: auto !important; height: auto !important; min-height: 100vh; touch-action: auto !important;';
    if (rootEl) {
      rootEl.style.cssText = 'position: static !important; overflow: visible !important; height: auto !important; min-height: 100vh; width: 100%;';
    }

    return () => {
      // Restore original styles when leaving the page
      document.documentElement.style.overflow = originalStyles.htmlOverflow;
      document.documentElement.style.height = originalStyles.htmlHeight;
      document.body.style.overflow = originalStyles.bodyOverflow;
      document.body.style.height = originalStyles.bodyHeight;
      document.body.style.touchAction = originalStyles.bodyTouchAction;
      if (rootEl) {
        rootEl.style.position = originalStyles.rootPosition;
        rootEl.style.overflow = originalStyles.rootOverflow;
        rootEl.style.height = originalStyles.rootHeight;
      }
    };
  }, []);

  // Check for subscription result from URL
  useEffect(() => {
    const subscriptionResult = searchParams.get('subscription');
    if (subscriptionResult === 'canceled') {
      // User canceled checkout
      console.log('Subscription checkout was canceled');
    }
  }, [searchParams]);

  // Check authentication
  useEffect(() => {
    const session = localStorage.getItem('wedboarpro_session');
    setIsAuthenticated(!!session);
  }, []);

  // Fetch plans and current subscription
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const fetchedPlans = await fetchSubscriptionPlans();
        setPlans(fetchedPlans);

        // If authenticated, fetch current subscription
        if (isAuthenticated) {
          try {
            const subscription = await fetchMySubscription();
            setCurrentSubscription(subscription);
          } catch (e) {
            // User might not have a subscription yet, that's ok
            console.log('No current subscription');
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAuthenticated]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      // Redirect to signup with plan info
      navigate(`/signup?plan=${plan.name}`);
      return;
    }

    try {
      setSubscribingPlanId(plan.id);
      await redirectToCheckout(plan.id, 'month');
    } catch (e: any) {
      setError(e.message || 'Failed to start checkout');
      setSubscribingPlanId(null);
    }
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    return currentSubscription?.subscription?.plan?.name === plan.name && 
           isSubscriptionActive(currentSubscription?.subscription || null);
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="pricing-loading">
          <div className="pricing-loading-spinner" />
          <p>Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="pricing-page">
        <div className="pricing-error">
          <h2>Unable to load pricing</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* Header */}
      <header className="pricing-header">
        <Link to="/" className="pricing-logo">
          <img src="/logo.png" alt="WedBoardPro" />
        </Link>
        <nav className="pricing-nav">
          {isAuthenticated ? (
            <Link to="/dashboard" className="pricing-nav-link">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="pricing-nav-link">Log in</Link>
              <Link to="/signup" className="pricing-btn-primary">Start Free Trial</Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="pricing-hero">
        <h1>Simple, transparent pricing</h1>
        <p>Start with a 14-day free trial. No credit card required to try.</p>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="pricing-error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Pricing Cards */}
      <section className="pricing-cards">
        {plans.map((plan) => {
          const highlight = PLAN_HIGHLIGHTS[plan.name];
          const isCurrent = isCurrentPlan(plan);
          const isSubscribing = subscribingPlanId === plan.id;

          return (
            <div 
              key={plan.id} 
              className={`pricing-card ${highlight?.badge ? 'featured' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {highlight?.badge && (
                <div className="pricing-card-badge">{highlight.badge}</div>
              )}
              
              <div className="pricing-card-header">
                <h3>{plan.displayName}</h3>
                <p className="pricing-card-highlight">{highlight?.highlight}</p>
              </div>

              <div className="pricing-card-price">
                <span className="pricing-amount">{formatPrice(plan.monthlyPrice)}</span>
                <span className="pricing-interval">/month</span>
              </div>

              <div className="pricing-card-cta">
                {isCurrent ? (
                  <button className="pricing-btn-current" disabled>
                    Current Plan
                  </button>
                ) : (
                  <button
                    className="pricing-btn-subscribe"
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <>
                        <span className="pricing-btn-spinner" />
                        Processing...
                      </>
                    ) : isAuthenticated ? (
                      'Subscribe Now'
                    ) : (
                      'Start Free Trial'
                    )}
                  </button>
                )}
              </div>

              <ul className="pricing-card-features">
                {(plan.features as string[]).map((feature, idx) => (
                  <li key={idx}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.additionalUserPrice > 0 && (
                <div className="pricing-card-addon">
                  + {formatPrice(plan.additionalUserPrice)}/user/month after {plan.maxTeamMembers} included
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Feature Comparison Table */}
      <section className="pricing-comparison">
        <h2>Compare all features</h2>
        <div className="pricing-table-wrapper">
          <table className="pricing-table">
            <thead>
              <tr>
                <th></th>
                {plans.map((plan) => (
                  <th key={plan.id}>{plan.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((category) => (
                <React.Fragment key={category.category}>
                  <tr className="pricing-table-category">
                    <td colSpan={plans.length + 1}>{category.category}</td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr key={feature.name}>
                      <td>{feature.name}</td>
                      <td>
                        <FeatureValue value={feature.starter} />
                      </td>
                      <td>
                        <FeatureValue value={feature.professional} />
                      </td>
                      <td>
                        <FeatureValue value={feature.enterprise} />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-faq">
        <h2>Frequently asked questions</h2>
        <div className="pricing-faq-grid">
          <div className="pricing-faq-item">
            <h4>Can I change plans later?</h4>
            <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>What happens after my trial ends?</h4>
            <p>After your 14-day trial, you'll be charged for your selected plan. You can cancel anytime before the trial ends without being charged.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>Is there a contract?</h4>
            <p>No long-term contracts. Pay monthly and cancel anytime. Annual plans offer savings but are paid upfront.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>Can I add more team members?</h4>
            <p>Yes! Each plan includes a base number of team members. You can add more at any time for an additional per-user fee.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>Do you offer refunds?</h4>
            <p>We offer a 30-day money-back guarantee. If you're not satisfied, contact us within 30 days of your first payment for a full refund.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>We accept all major credit cards (Visa, Mastercard, American Express) and process payments securely through Stripe.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pricing-final-cta">
        <h2>Ready to streamline your wedding planning business?</h2>
        <p>Start your 14-day free trial today. No credit card required.</p>
        <Link to="/signup" className="pricing-btn-primary-large">
          Start Free Trial
        </Link>
      </section>

      {/* Footer */}
      <footer className="pricing-footer">
        <p>© {new Date().getFullYear()} WedBoardPro. All rights reserved.</p>
        <nav>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </footer>
    </div>
  );
};

// Helper component for feature matrix values
const FeatureValue: React.FC<{ value: boolean | string }> = ({ value }) => {
  if (typeof value === 'boolean') {
    return value ? (
      <svg className="pricing-check" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <span className="pricing-dash">—</span>
    );
  }
  return <span className="pricing-text-value">{value}</span>;
};

export default PricingPage;

