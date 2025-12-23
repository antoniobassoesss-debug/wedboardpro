/**
 * AuthCallbackPage – handles OAuth redirect callback.
 * Exchanges the OAuth code for a Supabase session, stores it in localStorage,
 * then navigates to `next` or /dashboard.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from '../browserSupabaseClient';
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

        // With detectSessionInUrl: true, Supabase automatically exchanges the code
        // when the client initializes. We just need to wait a moment and retrieve the session.
        // Do NOT call exchangeCodeForSession manually - it will fail because the code
        // verifier was already consumed by Supabase's automatic handling.
        
        // Give Supabase a moment to finish processing the URL
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data, error: sessionError } = await browserSupabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          throw new Error('No authentication data received. Please try again.');
        }

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
        const msg = err?.message || 'Authentication failed';
        setError(msg);
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


