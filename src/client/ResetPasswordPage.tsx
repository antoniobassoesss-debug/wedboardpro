/**
 * ResetPasswordPage - Set new password with token from email
 * Includes password strength indicator and comprehensive validation
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from './browserSupabaseClient';
import './auth/auth.css';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!browserSupabaseClient) {
          throw new Error('Authentication service unavailable');
        }

        // Check if we have a session (Supabase sets this from the magic link)
        const { data: { session }, error } = await browserSupabaseClient.auth.getSession();

        if (error || !session) {
          setTokenValid(false);
          setError('Invalid or expired reset link. Please request a new password reset.');
        } else {
          setTokenValid(true);
        }
      } catch (err: any) {
        console.error('[reset-password] Token validation error:', err);
        setTokenValid(false);
        setError('Unable to validate reset link. Please try requesting a new one.');
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, []);

  // Password strength calculator
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 33, label: 'Weak', color: '#ef4444' };
    if (strength <= 4) return { strength: 66, label: 'Medium', color: '#f59e0b' };
    return { strength: 100, label: 'Strong', color: '#10b981' };
  };

  // Password validation
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a number';
    return null;
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || !passwordConfirm) {
      setError('Please fill in both password fields');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (!browserSupabaseClient) {
        throw new Error('Authentication service unavailable');
      }

      // Update password
      const { error: updateError } = await browserSupabaseClient.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      // Success!
      setSuccess(true);

      // Sign out after password reset (security best practice)
      await browserSupabaseClient.auth.signOut();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login?reset=success');
      }, 2000);
    } catch (err: any) {
      console.error('[reset-password] Error:', err);

      if (err.message?.includes('session')) {
        setError('Your reset link has expired. Please request a new password reset.');
      } else {
        setError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validatingToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <img
              src="/logo/iconlogo.png"
              alt="WedBoardPro"
              className="auth-logo"
            />
            <h1 className="auth-title">Validating Reset Link...</h1>
            <p className="auth-subtitle">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <img
              src="/logo/iconlogo.png"
              alt="WedBoardPro"
              className="auth-logo"
            />
            <h1 className="auth-title">Reset Link Invalid</h1>
            <p className="auth-subtitle">This link has expired or is invalid</p>
          </div>

          <div style={{
            background: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
            <p style={{ fontSize: '0.9rem', color: '#991b1b', lineHeight: '1.5' }}>
              {error || 'This password reset link is no longer valid. Reset links expire after 1 hour for security.'}
            </p>
          </div>

          <button
            onClick={() => navigate('/forgot-password')}
            className="auth-btn-primary"
          >
            Request New Reset Link
          </button>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.9rem',
                color: '#0c0c0c',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
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
            <h1 className="auth-title">Password Updated!</h1>
            <p className="auth-subtitle">You can now log in with your new password</p>
          </div>

          <div style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <p style={{
              fontSize: '0.95rem',
              color: '#065f46',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Your password has been successfully updated
            </p>
            <p style={{ fontSize: '0.85rem', color: '#059669' }}>
              Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main password reset form
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/logo/iconlogo.png"
            alt="WedBoardPro"
            className="auth-logo"
          />
          <h1 className="auth-title">Create New Password</h1>
          <p className="auth-subtitle">
            Choose a strong password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* New Password */}
          <label className="auth-label">
            New Password
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                required
                autoFocus
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && (
              <div className="auth-password-strength">
                <div className="auth-password-strength-bar">
                  <div
                    className="auth-password-strength-fill"
                    style={{
                      width: `${passwordStrength.strength}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
                <span
                  className="auth-password-strength-label"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.label}
                </span>
              </div>
            )}

            <span className="auth-field-help">
              Must be 8+ characters with uppercase, lowercase, and number
            </span>
          </label>

          {/* Confirm Password */}
          <label className="auth-label">
            Confirm New Password
            <div className="auth-input-wrapper">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="auth-input"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPasswordConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {passwordConfirm && password !== passwordConfirm && (
              <span className="auth-field-error">Passwords must match</span>
            )}
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={loading || !password || !passwordConfirm}
            className="auth-btn-primary"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>

          <div style={{
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '12px',
            marginTop: '16px'
          }}>
            <p style={{
              fontSize: '0.8rem',
              color: '#0c4a6e',
              margin: 0,
              lineHeight: '1.4'
            }}>
              🔒 For security, you'll be logged out after resetting your password.
              Use your new password to log in.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
