/**
 * EmailPasswordForm – handles email/password submission for login or signup.
 * mode='login': 2 fields (email, password)
 * mode='signup': 5 fields (email, fullName, phone, businessName, password, passwordConfirm)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from '../browserSupabaseClient';
import { storeSession } from '../utils/sessionManager';
import './auth.css';

interface EmailPasswordFormProps {
  mode: 'login' | 'signup';
}

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  businessName?: string;
}

const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({ mode }) => {
  console.log('[EmailPasswordForm] mode =', mode); // DEBUG
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';
  const oauthErrorFromRedirect = searchParams.get('oauth_error');
  const oauthErrorDirect = searchParams.get('error_description') || searchParams.get('error');
  const emailFromUrl = searchParams.get('email') || '';
  const justVerified = searchParams.get('verified') === 'true';

  // Form state
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(
    oauthErrorFromRedirect || oauthErrorDirect || null
  );
  const [loading, setLoading] = useState(false);
  const [checkingOAuth, setCheckingOAuth] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    justVerified ? '✓ Email verified! You can now log in.' : null
  );

  useEffect(() => {
    if (error) return;
    try {
      const last = window.localStorage.getItem('wedboardpro_oauth_last_error');
      if (last && last.trim()) {
        setError(last.trim());
        window.localStorage.removeItem('wedboardpro_oauth_last_error');
      }
    } catch {
      // ignore
    }
  }, [error]);

  const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

  // Auto-complete OAuth login
  useEffect(() => {
    if (mode !== 'login') return;
    if (!browserSupabaseClient) return;

    const alreadyHasAppSession = !!window.localStorage.getItem('wedboarpro_session');
    if (alreadyHasAppSession) return;

    let cancelled = false;
    setCheckingOAuth(true);
    (async () => {
      try {
        const { data, error: sessErr } = await browserSupabaseClient.auth.getSession();
        if (cancelled) return;
        if (sessErr) {
          setError(sessErr.message);
          return;
        }
        const session = data.session;
        if (!session) return;

        const user = session.user;
        storeSession(session, user);
        navigate(sanitizedNext);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Google sign-in did not complete. Please try again.');
      } finally {
        if (!cancelled) setCheckingOAuth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, navigate, sanitizedNext]);

  // Real-time validation
  const validateField = (field: keyof FormErrors, value: string): string | undefined => {
    switch (field) {
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return undefined;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain a number';
        return undefined;

      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        return undefined;

      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 15) {
          return 'Please enter a valid phone number';
        }
        return undefined;

      case 'businessName':
        if (!value.trim()) return 'Business/Studio name is required';
        if (value.trim().length < 2) return 'Business name must be at least 2 characters';
        return undefined;

      default:
        return undefined;
    }
  };

  const handleBlur = (field: keyof FormErrors, value: string) => {
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      // Check if email confirmation is required
      if (data?.requiresEmailConfirmation) {
        // Redirect to email confirmation waiting page
        navigate(`/confirm-email?email=${encodeURIComponent(email)}`);
        return;
      }
      throw new Error(data?.error || text || `Login failed (status ${res.status})`);
    }

    const session = data.session ?? null;
    const user = data.user ?? session?.user ?? null;
    storeSession(session, user);
    navigate(sanitizedNext);
  };

  const handleSignup = async () => {
    // Validate all fields
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);
    const fullNameError = validateField('fullName', fullName);
    const phoneError = validateField('phone', phone);
    const businessNameError = validateField('businessName', businessName);

    const validationErrors: FormErrors = {};
    if (emailError) validationErrors.email = emailError;
    if (passwordError) validationErrors.password = passwordError;
    if (fullNameError) validationErrors.fullName = fullNameError;
    if (phoneError) validationErrors.phone = phoneError;
    if (businessNameError) validationErrors.businessName = businessNameError;

    // Check password confirmation
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    const hasErrors = Object.values(validationErrors).some(err => err !== undefined);
    if (hasErrors) {
      setErrors(validationErrors);
      setError('Please fix the errors above');
      return;
    }

    // Step 1: Create account
    const signupRes = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
      }),
    });

    const signupText = await signupRes.text();
    let signupData: any = {};
    try {
      signupData = signupText ? JSON.parse(signupText) : {};
    } catch {
      // non-JSON
    }

    if (!signupRes.ok) {
      throw new Error(
        signupData?.error || signupText || `Signup failed (status ${signupRes.status})`
      );
    }

    // Show success toast
    const successDiv = document.createElement('div');
    successDiv.className = 'auth-success-toast';
    successDiv.textContent = '✓ Account created! Check your email to confirm.';
    document.body.appendChild(successDiv);

    // Redirect to email confirmation waiting page
    setTimeout(() => {
      navigate(`/confirm-email?email=${encodeURIComponent(email.trim())}`);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    setLoading(true);

    try {
      if (mode === 'login') {
        await handleLogin();
      } else {
        await handleSignup();
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const buttonText = mode === 'login'
    ? (loading ? 'Signing in...' : 'Log In')
    : (loading ? 'Creating account...' : 'Sign Up');

  // Password strength indicator
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

  const passwordStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {checkingOAuth && !error && (
        <div className="auth-error" style={{ color: '#6b6b6b' }}>
          Completing Google sign in…
        </div>
      )}

      {/* Email field */}
      <label className="auth-label">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) handleBlur('email', e.target.value);
          }}
          onBlur={(e) => handleBlur('email', e.target.value)}
          required
          className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
        />
        {errors.email && <span className="auth-field-error">{errors.email}</span>}
      </label>

      {/* Signup-only fields */}
      {mode === 'signup' && (
        <>
          <label className="auth-label">
            Full Name
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) handleBlur('fullName', e.target.value);
              }}
              onBlur={(e) => handleBlur('fullName', e.target.value)}
              required
              className={`auth-input ${errors.fullName ? 'auth-input-error' : ''}`}
              placeholder="John Smith"
              autoComplete="name"
              disabled={loading}
            />
            {errors.fullName && <span className="auth-field-error">{errors.fullName}</span>}
          </label>

          <label className="auth-label">
            Phone Number
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) handleBlur('phone', e.target.value);
              }}
              onBlur={(e) => handleBlur('phone', e.target.value)}
              required
              className={`auth-input ${errors.phone ? 'auth-input-error' : ''}`}
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
              disabled={loading}
            />
            {errors.phone && <span className="auth-field-error">{errors.phone}</span>}
            <span className="auth-field-help">Used for account recovery and notifications</span>
          </label>

          <label className="auth-label">
            Business/Studio Name
            <input
              type="text"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                if (errors.businessName) handleBlur('businessName', e.target.value);
              }}
              onBlur={(e) => handleBlur('businessName', e.target.value)}
              required
              className={`auth-input ${errors.businessName ? 'auth-input-error' : ''}`}
              placeholder="Elegant Events Co."
              autoComplete="organization"
              disabled={loading}
            />
            {errors.businessName && (
              <span className="auth-field-error">{errors.businessName}</span>
            )}
            <span className="auth-field-help">
              This will be your team name in WedBoardPro
            </span>
          </label>
        </>
      )}

      {/* Password field */}
      <label className="auth-label">
        Password
        <div className="auth-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) handleBlur('password', e.target.value);
            }}
            onBlur={(e) => handleBlur('password', e.target.value)}
            required
            className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={loading}
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
        {errors.password && <span className="auth-field-error">{errors.password}</span>}

        {/* Password strength indicator for signup */}
        {mode === 'signup' && password && passwordStrength && (
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

        {mode === 'signup' && !errors.password && (
          <span className="auth-field-help">
            Must be 8+ characters with uppercase, lowercase, and number
          </span>
        )}
      </label>

      {/* Password confirmation for signup */}
      {mode === 'signup' && (
        <label className="auth-label">
          Confirm Password
          <div className="auth-input-wrapper">
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className="auth-input"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
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
      )}

      {successMessage && (
        <div style={{
          padding: '12px 16px',
          background: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '12px',
          color: '#065f46',
          fontSize: '0.9rem',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          {successMessage}
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {buttonText}
      </button>

      {mode === 'signup' && (
        <p className="auth-terms">
          By signing up, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </p>
      )}
    </form>
  );
};

export default EmailPasswordForm;
