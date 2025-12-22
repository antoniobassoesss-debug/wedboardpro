/**
 * AuthCallbackPage – handles OAuth redirect callback.
 * Exchanges the OAuth code for a Supabase session, stores it in localStorage,
 * then navigates to `next` or /dashboard.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from '../browserSupabaseClient.js';
import './auth.css';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!browserSupabaseClient) {
        setError('Authentication service unavailable');
        return;
      }

      try {
        // Surface provider / Supabase errors directly if present
        const oauthError = searchParams.get('error');
        const oauthErrorDescription = searchParams.get('error_description');
        if (oauthError || oauthErrorDescription) {
          setError(
            oauthErrorDescription ||
              oauthError ||
              'Google sign-in failed. Please try again.'
          );
          return;
        }

        const nextUrl = searchParams.get('next') || '/dashboard';
        const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

        // Prefer explicit code exchange when present
        const code = searchParams.get('code');
        if (code) {
          const { data: exchangeData, error: exchangeError } = await browserSupabaseClient.auth.exchangeCodeForSession(
            code,
          );
          if (exchangeError) throw exchangeError;

          const session = exchangeData.session;
          if (!session) throw new Error('No session returned from OAuth exchange');

          const user = session.user;
          const displayName =
            (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
            (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
            (typeof user?.email === 'string' && user.email.trim()) ||
            'User';

          localStorage.setItem('wedboarpro_session', JSON.stringify(session));
          localStorage.setItem('wedboarpro_user', JSON.stringify(user));
          localStorage.setItem('wedboarpro_display_name', displayName);

          navigate(sanitizedNext, { replace: true });
          return;
        }

        // Fallback: if Supabase already processed the URL, try getSession
        const { data, error: sessionError } = await browserSupabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('No authentication data received. Please try again.');

        const session = data.session;
        const user = session.user;
        const displayName =
          (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
          (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
          (typeof user?.email === 'string' && user.email.trim()) ||
          'User';

        localStorage.setItem('wedboarpro_session', JSON.stringify(session));
        localStorage.setItem('wedboarpro_user', JSON.stringify(user));
        localStorage.setItem('wedboarpro_display_name', displayName);

        navigate(sanitizedNext, { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        // Provide a slightly more actionable message for common OAuth misconfig
        const msg = err?.message || 'Authentication failed';
        if (typeof msg === 'string' && msg.toLowerCase().includes('redirect')) {
          setError(
            `${msg}\n\nMake sure your Supabase Redirect URLs include:\n- ${window.location.origin}/auth/callback`
          );
        } else {
          setError(msg);
        }
      }
    };

    run();
  }, [navigate, searchParams]);

  return (
    <div className="auth-callback-page">
      <img src="/loadinglogo.png" alt="Loading" className="auth-loading-logo" />
      {error ? (
        <>
          <p className="auth-callback-error">{error}</p>
          <button onClick={() => navigate('/login', { replace: true })} className="auth-callback-retry">
            Back to Login
          </button>
        </>
      ) : (
        <p className="auth-callback-text">Completing sign in...</p>
      )}
    </div>
  );
};

export default AuthCallbackPage;


