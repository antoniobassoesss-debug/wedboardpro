/**
 * VerificationBanner - Persistent banner shown to unverified users
 * Following Notion/Linear UX pattern: dismissible but reappears on refresh
 */
import React, { useEffect, useState } from 'react';
import './VerificationBanner.css';

interface VerificationBannerProps {
  onResend?: () => void;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({ onResend }) => {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Check if user just signed up
  const justSignedUp = window.localStorage.getItem('wedboardpro_just_signed_up') === 'true';

  useEffect(() => {
    // Clear the flag after showing once
    if (justSignedUp) {
      window.localStorage.removeItem('wedboardpro_just_signed_up');
    }
  }, [justSignedUp]);

  const handleResend = async () => {
    setLoading(true);
    setResendSuccess(false);

    try {
      const session = JSON.parse(
        window.localStorage.getItem('wedboarpro_session') || '{}'
      );
      const token = session?.access_token;

      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setResendSuccess(true);
        if (onResend) onResend();

        // Auto-hide success message after 5 seconds
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      alert('Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="verification-banner">
      <div className="verification-banner-content">
        <div className="verification-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="verification-banner-text">
          <strong>Please verify your email address</strong>
          {justSignedUp ? (
            <span>
              We've sent a verification link to your email. Click the link to unlock all features.
            </span>
          ) : (
            <span>
              Some features are limited until you verify your email address.
            </span>
          )}
        </div>

        <div className="verification-banner-actions">
          {resendSuccess ? (
            <span className="verification-banner-success">Email sent! Check your inbox.</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="verification-banner-btn"
            >
              {loading ? 'Sending...' : 'Resend Email'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="verification-banner-dismiss"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;
