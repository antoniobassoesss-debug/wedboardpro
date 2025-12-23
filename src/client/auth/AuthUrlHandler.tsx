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
    const code = sp.get('code');
    const hasAccessToken = (url.hash || '').includes('access_token=');

    const shouldHandle = !!code || hasAccessToken;
    if (!shouldHandle) return;

    setHandled(true);

    (async () => {
      try {
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
        }

        navigate(next, { replace: true });
      } catch {
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handled, location.key]);

  return null;
};

export default AuthUrlHandler;

