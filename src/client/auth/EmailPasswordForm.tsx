/**
 * EmailPasswordForm – handles email/password submission for login or signup.
 * mode='login': calls /api/auth/login, stores session, redirects.
 * mode='signup': calls /api/auth/signup, then auto-logs in, stores session, redirects.
 */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './auth.css';

interface EmailPasswordFormProps {
  mode: 'login' | 'signup';
}

const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';
  const oauthErrorFromRedirect = searchParams.get('oauth_error');
  const oauthErrorDirect = searchParams.get('error_description') || searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(oauthErrorFromRedirect || oauthErrorDirect || null);
  const [loading, setLoading] = useState(false);

  // Sanitize next param to only allow internal paths
  const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

  const storeSession = (session: any, user: any, displayName: string) => {
    localStorage.setItem('wedboarpro_session', JSON.stringify(session));
    localStorage.setItem('wedboarpro_user', JSON.stringify(user));
    localStorage.setItem('wedboarpro_display_name', displayName);
  };

  const resolveDisplayName = (user: any, fallbackEmail: string): string => {
    return (
      (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
      (typeof user?.email === 'string' && user.email.trim()) ||
      fallbackEmail.trim()
    );
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
      throw new Error(data?.error || text || `Login failed (status ${res.status})`);
    }

    const session = data.session ?? null;
    const user = data.user ?? session?.user ?? null;
    const displayName = resolveDisplayName(user, email);
    storeSession(session, user, displayName);
    navigate(sanitizedNext);
  };

  const handleSignup = async () => {
    // Step 1: Create account
    const signupRes = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const signupText = await signupRes.text();
    let signupData: any = {};
    try {
      signupData = signupText ? JSON.parse(signupText) : {};
    } catch {
      // non-JSON
    }

    if (!signupRes.ok) {
      throw new Error(signupData?.error || signupText || `Signup failed (status ${signupRes.status})`);
    }

    // Step 2: Auto-login
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginText = await loginRes.text();
    let loginData: any = {};
    try {
      loginData = loginText ? JSON.parse(loginText) : {};
    } catch {
      // non-JSON
    }

    if (!loginRes.ok) {
      throw new Error(loginData?.error || loginText || `Auto-login failed (status ${loginRes.status})`);
    }

    const session = loginData.session ?? null;
    const user = loginData.user ?? session?.user ?? null;
    const displayName = resolveDisplayName(user, email);
    storeSession(session, user, displayName);
    navigate(sanitizedNext);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-label">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-input"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>
      <label className="auth-label">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="auth-input"
          placeholder="••••••••"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>
      {error && <div className="auth-error">{error}</div>}
      <button type="submit" disabled={loading} className="auth-btn-primary">
        {buttonText}
      </button>
    </form>
  );
};

export default EmailPasswordForm;

