/**
 * EmailPasswordForm – handles email/password submission for login or signup.
 * mode='login': calls /api/auth/login, stores session, redirects.
 * mode='signup': calls /api/auth/signup, then auto-logs in, stores session, redirects.
 */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './auth.css';

const EmailPasswordForm = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

  const storeSession = (session, user, displayName) => {
    localStorage.setItem('wedboarpro_session', JSON.stringify(session));
    localStorage.setItem('wedboarpro_user', JSON.stringify(user));
    localStorage.setItem('wedboarpro_display_name', displayName);
  };

  const resolveDisplayName = (user, fallbackEmail) =>
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (typeof user?.email === 'string' && user.email.trim()) ||
    fallbackEmail.trim();

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // ignore
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
    const signupRes = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const signupText = await signupRes.text();
    let signupData = {};
    try {
      signupData = signupText ? JSON.parse(signupText) : {};
    } catch {
      // ignore
    }

    if (!signupRes.ok) {
      throw new Error(signupData?.error || signupText || `Signup failed (status ${signupRes.status})`);
    }

    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginText = await loginRes.text();
    let loginData = {};
    try {
      loginData = loginText ? JSON.parse(loginText) : {};
    } catch {
      // ignore
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') await handleLogin();
      else await handleSignup();
    } catch (err) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const buttonText =
    mode === 'login' ? (loading ? 'Signing in...' : 'Log In') : loading ? 'Creating account...' : 'Sign Up';

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


