/**
 * AuthUrlHandler – processes Supabase OAuth return params on ANY route.
 * This avoids relying on deep-link callback pages that may fail to load on some devices.
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { browserSupabaseClient } from '../browserSupabaseClient';

function sanitizeNext(nextUrl: string | null): string {
  const fallback = '/dashboard';
  if (!nextUrl) return fallback;
  return nextUrl.startsWith('/') ? nextUrl : fallback;
}

const AuthUrlHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled) return;
    if (!browserSupabaseClient) return;

    const url = new URL(window.location.href);
    const sp = url.searchParams;

    const next = sanitizeNext(sp.get('next'));
    const oauthError = sp.get('error') || sp.get('error_description');
    const code = sp.get('code');
    const hasAccessToken = (url.hash || '').includes('access_token=');

    const alreadyHasAppSession = !!window.localStorage.getItem('wedboarpro_session');
    const mightHaveSupabaseSession =
      // common return points
      url.pathname === '/' ||
      url.pathname === '/login' ||
      url.pathname === '/signup' ||
      // if a next param is present, we want to continue the flow
      !!sp.get('next');

    const shouldHandle = !!oauthError || !!code || hasAccessToken || (!alreadyHasAppSession && mightHaveSupabaseSession);
    if (!shouldHandle) return;

    setHandled(true);

    (async () => {
      try {
        if (oauthError) {
          throw new Error(oauthError);
        }
        if (code) {
          const { data, error } = await browserSupabaseClient.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const session = data.session;
          if (session) {
            const user = session.user;
            const displayName =
              (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
              (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
              (typeof user?.email === 'string' && user.email.trim()) ||
              'User';

            localStorage.setItem('wedboarpro_session', JSON.stringify(session));
            localStorage.setItem('wedboarpro_user', JSON.stringify(user));
            localStorage.setItem('wedboarpro_display_name', displayName);
          }
        } else if (hasAccessToken) {
          const { data, error } = await browserSupabaseClient.auth.getSession();
          if (error) throw error;

          const session = data.session;
          if (session) {
            const user = session.user;
            const displayName =
              (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
              (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
              (typeof user?.email === 'string' && user.email.trim()) ||
              'User';

            localStorage.setItem('wedboarpro_session', JSON.stringify(session));
            localStorage.setItem('wedboarpro_user', JSON.stringify(user));
            localStorage.setItem('wedboarpro_display_name', displayName);
          }
        } else if (!alreadyHasAppSession) {
          // If Supabase already processed the URL (detectSessionInUrl), the code may be gone.
          // In that case, just read the current Supabase session and persist it for the app.
          const { data, error } = await browserSupabaseClient.auth.getSession();
          if (error) throw error;
          const session = data.session;
          if (!session) {
            throw new Error('Google sign-in did not complete. Please try again.');
          }
          const user = session.user;
          const displayName =
            (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
            (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
            (typeof user?.email === 'string' && user.email.trim()) ||
            'User';

          localStorage.setItem('wedboarpro_session', JSON.stringify(session));
          localStorage.setItem('wedboarpro_user', JSON.stringify(user));
          localStorage.setItem('wedboarpro_display_name', displayName);
        }

        navigate(next, { replace: true });
      } catch (e: any) {
        const msg =
          (typeof e?.message === 'string' && e.message.trim()) ||
          (typeof e === 'string' && e.trim()) ||
          'Google sign-in failed. Please try again.';
        try {
          window.localStorage.setItem('wedboardpro_oauth_last_error', msg);
        } catch {
          // ignore
        }
        navigate(`/login?next=${encodeURIComponent(next)}&oauth_error=${encodeURIComponent(msg)}`, {
          replace: true,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handled, location.key]);

  return null;
};

export default AuthUrlHandler;

