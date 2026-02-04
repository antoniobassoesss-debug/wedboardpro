import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentPlan: string;
  requiredPlan: string;
  currentUsage?: number;
  limit?: number;
  message?: string;
}

const planBenefits: Record<string, string[]> = {
  professional: [
    'Up to 30 active events',
    '8 team members',
    'Team shared contacts & suppliers',
    'Task assignment to team members',
    'Team chat & collaboration',
    'Up to 1,000 client profiles',
  ],
  enterprise: [
    'Unlimited active events',
    '25 team members',
    'All Professional features',
    'Unlimited client profiles',
    'Unlimited tasks per event',
    'Priority support',
  ],
};

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  feature,
  currentPlan,
  requiredPlan,
  currentUsage,
  limit,
  message,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  const formatPlanName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const defaultMessage = limit !== undefined && currentUsage !== undefined
    ? `You've reached the limit of ${limit} ${feature} on the ${formatPlanName(currentPlan)} plan.`
    : `This feature requires the ${formatPlanName(requiredPlan)} plan.`;

  const benefits = planBenefits[requiredPlan] || planBenefits.professional;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '28px 28px 0',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #0c0c0c 0%, #333 100%)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: '#0c0c0c',
              letterSpacing: '-0.02em',
            }}
          >
            Upgrade to {formatPlanName(requiredPlan)}
          </h2>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 15,
              color: '#666',
              lineHeight: 1.5,
            }}
          >
            {message || defaultMessage}
          </p>
        </div>

        {/* Benefits */}
        <div
          style={{
            padding: '24px 28px',
          }}
        >
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#0c0c0c',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {formatPlanName(requiredPlan)} includes:
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {benefits.map((benefit, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  fontSize: 14,
                  color: '#333',
                  borderBottom: index < benefits.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0c0c0c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '0 28px 28px',
            display: 'flex',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: '1px solid #e0e0e0',
              borderRadius: 12,
              background: '#fff',
              color: '#666',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            style={{
              flex: 2,
              padding: '14px 20px',
              border: 'none',
              borderRadius: 12,
              background: '#0c0c0c',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#333';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#0c0c0c';
            }}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default UpgradePromptModal;



