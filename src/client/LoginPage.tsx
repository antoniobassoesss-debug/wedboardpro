import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.warn('Login: response not JSON', text);
      }

      if (!res.ok) {
        const message = data?.error || text || `Login failed (status ${res.status})`;
        throw new Error(message);
      }

      const sessionPayload = data.session ?? null;
      const userPayload = data.user ?? sessionPayload?.user ?? null;
      const resolvedDisplayName =
        (typeof userPayload?.user_metadata?.full_name === 'string' && userPayload.user_metadata.full_name.trim()) ||
        (typeof userPayload?.user_metadata?.name === 'string' && userPayload.user_metadata.name.trim()) ||
        (typeof userPayload?.email === 'string' && userPayload.email.trim()) ||
        email.trim();

      localStorage.setItem('wedboarpro_session', JSON.stringify(sessionPayload));
      localStorage.setItem('wedboarpro_user', JSON.stringify(userPayload));
      localStorage.setItem('wedboarpro_display_name', resolvedDisplayName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        fontFamily: 'Geist, Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 32,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 40,
          boxShadow: '0 30px 60px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo/iconlogo.png" alt="WedBoarPro" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          <h1 style={{ margin: '16px 0 8px 0' }}>Log in to WedBoarPro</h1>
          <p style={{ margin: 0, color: '#6b6b6b' }}>Enter your credentials to access the dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600 }}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.2)',
                padding: '12px 18px',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.2)',
                padding: '12px 18px',
              }}
            />
          </label>
          {error && (
            <div style={{ color: '#b91c1c', fontSize: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              borderRadius: 999,
              padding: '12px 18px',
              border: 'none',
              background: '#0c0c0c',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#6b6b6b' }}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" style={{ color: '#0c0c0c', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

