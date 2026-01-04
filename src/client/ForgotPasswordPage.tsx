/**
 * ForgotPasswordPage - Request password reset email
 * Professional UX with rate limiting and clear feedback
 *
 * NOTE: Reset link must be opened on same browser/device due to PKCE security.
 * This is standard for client-side password reset flows.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { browserSupabaseClient } from './browserSupabaseClient';
import './auth/auth.css';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another reset link`);
      return;
    }

    setLoading(true);

    try {
      if (!browserSupabaseClient) {
        throw new Error('Authentication service unavailable');
      }

      // Use client-side password reset (sends emails automatically)
      // Note: The reset link must be opened on the same browser/device for security (PKCE)
      const redirectUrl = `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`;
      console.log('[ForgotPassword] Starting password reset request');
      console.log('[ForgotPassword] Email:', email.toLowerCase().trim());
      console.log('[ForgotPassword] Redirect URL:', redirectUrl);
      console.log('[ForgotPassword] Supabase client available:', !!browserSupabaseClient);

      const result = await browserSupabaseClient.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: redirectUrl,
        }
      );

      console.log('[ForgotPassword] Reset result:', {
        hasError: !!result.error,
        hasData: !!result.data,
        error: result.error,
        data: result.data,
      });

      if (result.error) {
        console.error('[ForgotPassword] Reset error:', result.error);
        throw result.error;
      }

      console.log('[ForgotPassword] ✅ Reset request successful - email should be sent by Supabase');

      // Success! Show success message
      // Note: For security, we show success even if email doesn't exist
      setSuccess(true);
      setSubmittedEmail(email.trim());
      setCooldown(60); // 60 second cooldown

      // Store timestamp to prevent abuse
      try {
        window.localStorage.setItem(
          'wedboardpro_password_reset_last',
          Date.now().toString()
        );
      } catch {
        // Ignore localStorage errors
      }
    } catch (err: any) {
      // For security, don't reveal if email exists or not
      // Show generic error for any issues
      console.error('[forgot-password] Error:', err);
      setError('Unable to send reset email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setEmail(submittedEmail);
    setSuccess(false);
    handleSubmit(new Event('submit') as any);
  };

  if (success) {
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
              We've sent password reset instructions
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
              {submittedEmail}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
              If an account exists with this email, you'll receive password reset instructions.
              Check your inbox (and spam folder).
            </p>
          </div>

          <div style={{
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '0.85rem',
              color: '#92400e',
              margin: 0,
              lineHeight: '1.5'
            }}>
              🔒 <strong>Security note:</strong> The reset link will expire in 1 hour.
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ fontSize: '0.85rem', color: '#6b6b6b', marginBottom: '12px' }}>
              Didn't receive the email?
            </p>
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '999px',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: cooldown > 0 ? '#9ca3af' : '#0c0c0c',
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (cooldown === 0) {
                  e.currentTarget.style.borderColor = '#0c0c0c';
                  e.currentTarget.style.background = '#f5f5f5';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
            </button>
          </div>

          <div style={{
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <Link
              to="/login"
              style={{
                fontSize: '0.9rem',
                color: '#0c0c0c',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/logo/iconlogo.png"
            alt="WedBoardPro"
            className="auth-logo"
          />
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-subtitle">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              autoFocus
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="auth-btn-primary"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.85rem', color: '#6b6b6b', marginBottom: '8px' }}>
              Remember your password?
            </p>
            <Link
              to="/login"
              style={{
                fontSize: '0.9rem',
                color: '#0c0c0c',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
