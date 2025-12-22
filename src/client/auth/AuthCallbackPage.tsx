/**
 * AuthCallbackPage – handles OAuth redirect callback.
 * Reads `code` from URL, exchanges it for a session using browserSupabaseClient,
 * stores session/user/displayName in localStorage, then navigates to `next` or /dashboard.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browserSupabaseClient } from '../browserSupabaseClient';
import './auth.css';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      if (!browserSupabaseClient) {
        setError('Authentication service unavailable');
        return;
      }

      try {
        // Supabase appends the code as a hash fragment or query param
        // For PKCE flow, it's usually in the URL hash as #access_token=...
        // or as query params ?code=...
        
        // First, try to get session from URL (Supabase handles this automatically)
        const { data, error: sessionError } = await browserSupabaseClient.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (data.session) {
          // Session obtained successfully
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

          // Get next param and sanitize
          const nextUrl = searchParams.get('next') || '/dashboard';
          const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

          navigate(sanitizedNext, { replace: true });
          return;
        }

        // If no session yet, try to exchange code for session
        // This handles the case where Supabase returns a code in the URL
        const code = searchParams.get('code');
        if (code) {
          const { data: exchangeData, error: exchangeError } = 
            await browserSupabaseClient.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }

          if (exchangeData.session) {
            const session = exchangeData.session;
            const user = session.user;

            const displayName =
              (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
              (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
              (typeof user?.email === 'string' && user.email.trim()) ||
              'User';

            localStorage.setItem('wedboarpro_session', JSON.stringify(session));
            localStorage.setItem('wedboarpro_user', JSON.stringify(user));
            localStorage.setItem('wedboarpro_display_name', displayName);

            const nextUrl = searchParams.get('next') || '/dashboard';
            const sanitizedNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard';

            navigate(sanitizedNext, { replace: true });
            return;
          }
        }

        // No session and no code - something went wrong
        setError('No authentication data received. Please try again.');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err?.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="auth-callback-page">
      <img
        src="/loadinglogo.png"
        alt="Loading"
        className="auth-loading-logo"
      />
      {error ? (
        <>
          <p className="auth-callback-error">{error}</p>
          <button onClick={handleRetry} className="auth-callback-retry">
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

