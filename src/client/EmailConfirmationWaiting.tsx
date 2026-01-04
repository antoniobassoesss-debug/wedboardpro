/**
 * EmailConfirmationWaiting - Screen shown after signup requiring email confirmation
 * Users must verify their email before accessing the app
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from './browserSupabaseClient';
import './auth/auth.css';

const EmailConfirmationWaiting: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      if (!browserSupabaseClient) {
        throw new Error('Authentication service unavailable');
      }

      const { error } = await browserSupabaseClient.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }

      setResendSuccess(true);
      setResendCooldown(60); // 60 second cooldown before next resend

      // Hide success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setResendError(err?.message || 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckConfirmation = async () => {
    setChecking(true);
    setCheckError(null);

    try {
      if (!email) {
        setCheckError('Email address not found. Please sign up again.');
        setChecking(false);
        return;
      }

      // Since user isn't logged in yet, we need to check via the backend
      // by attempting to get their verification status
      const res = await fetch('/api/auth/check-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check verification status');
      }

      if (data.verified) {
        // Email is verified! Redirect to login page with a message
        navigate(`/login?verified=true&email=${encodeURIComponent(email)}`);
      } else {
        // Not yet confirmed
        setCheckError('Email not yet confirmed. Please check your inbox and click the confirmation link.');
      }
    } catch (err: any) {
      setCheckError(err?.message || 'Unable to verify confirmation status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/logo/iconlogo.png"
            alt="WedBoardPro"
            className="auth-logo"
          />
          <h1 className="auth-title">Check Your Email</h1>
          <p className="auth-subtitle">
            We've sent a confirmation link to verify your account
          </p>
        </div>

        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
          <p style={{
            fontSize: '0.95rem',
            color: '#0c4a6e',
            marginBottom: '8px',
            fontWeight: 600
          }}>
            {email}
          </p>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
            Click the confirmation link in the email to activate your account.
            <br />
            Don't forget to check your spam folder!
          </p>
        </div>

        <button
          onClick={handleCheckConfirmation}
          disabled={checking}
          className="auth-btn-primary"
          style={{ marginBottom: '12px' }}
        >
          {checking ? 'Checking...' : "I've Confirmed My Email"}
        </button>

        {checkError && (
          <div className="auth-error" style={{ marginBottom: '16px' }}>
            {checkError}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '0.85rem', color: '#6b6b6b', marginBottom: '12px' }}>
            Didn't receive the email?
          </p>

          <button
            onClick={handleResendEmail}
            disabled={resending || resendCooldown > 0}
            style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '999px',
              padding: '10px 20px',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: resendCooldown > 0 ? '#9ca3af' : '#0c0c0c',
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              if (resendCooldown === 0) {
                e.currentTarget.style.borderColor = '#0c0c0c';
                e.currentTarget.style.background = '#f5f5f5';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
          </button>

          {resendSuccess && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '12px',
              fontSize: '0.85rem',
              color: '#065f46',
              fontWeight: 600
            }}>
              ✓ Email sent! Check your inbox.
            </div>
          )}

          {resendError && (
            <div className="auth-error" style={{ marginTop: '12px' }}>
              {resendError}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.85rem', color: '#6b6b6b' }}>
            Wrong email address?{' '}
            <button
              onClick={() => navigate('/signup')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0c0c0c',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Sign up again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationWaiting;
