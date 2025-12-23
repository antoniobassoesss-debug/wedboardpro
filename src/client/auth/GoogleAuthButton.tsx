/**
 * GoogleAuthButton – renders a Google-branded OAuth button.
 * Calls browserSupabaseClient.auth.signInWithOAuth({ provider: 'google' })
 * with redirectTo pointing to /auth/callback?next=...
 */
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from '../browserSupabaseClient';
import './auth.css';

const GoogleAuthButton: React.FC = () => {
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sanitize next param
  const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

  const handleGoogleSignIn = async () => {
    if (!browserSupabaseClient) {
      setError('Authentication service unavailable');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const envOriginRaw = (import.meta.env.VITE_SITE_URL || '').trim();
      const runtimeOrigin = window.location.origin;

      const normalizeOrigin = (origin: string): string | null => {
        if (!origin) return null;
        try {
          const url = new URL(origin);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
          // normalize to origin only (no path) and remove trailing slash
          return url.origin;
        } catch {
          return null;
        }
      };

      const envOrigin = normalizeOrigin(envOriginRaw);
      const envLooksLocal = !!envOrigin && envOrigin.includes('localhost');
      const runtimeIsLocal = runtimeOrigin.includes('localhost');

      // Prefer env origin if valid, but never force localhost when we're on a non-local host.
      const siteOrigin = envOrigin && !(envLooksLocal && !runtimeIsLocal) ? envOrigin : runtimeOrigin;

      // Redirect to "/" so OAuth return always hits a known-good route on mobile Safari.
      // AuthUrlHandler will detect ?code= or #access_token on ANY route and finish login.
      const redirectTo = `${siteOrigin}/?next=${encodeURIComponent(sanitizedNext)}`;

      const { error: oauthError } = await browserSupabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      // If successful, the page will redirect to Google
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate Google sign-in');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="auth-btn-google"
        aria-label="Continue with Google"
      >
        {/* Official Google "G" icon SVG */}
        <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? 'Continuing...' : 'Continue with Google'}
      </button>
      {error && <div className="auth-error">{error}</div>}
    </>
  );
};

export default GoogleAuthButton;

