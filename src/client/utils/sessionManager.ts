/**
 * Session Manager - Handles automatic token refresh for Supabase sessions
 * Prevents "unauthorized" errors when JWT tokens expire
 */

import { browserSupabaseClient } from '../browserSupabaseClient';

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user?: any;
}

const SESSION_KEY = 'wedboarpro_session';
const USER_KEY = 'wedboarpro_user';

/**
 * Gets the current session from localStorage
 */
export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stores session and user data in localStorage
 */
export function storeSession(session: any, user: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  // Store display name if available
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'User';
  localStorage.setItem('wedboarpro_display_name', displayName);
}

/**
 * Clears all session data from localStorage
 */
export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('wedboarpro_display_name');
}

/**
 * Checks if the current token is expired or will expire soon (within 5 minutes)
 */
function isTokenExpired(session: StoredSession): boolean {
  if (!session.expires_at) return false;

  // Consider token expired if it expires in less than 5 minutes
  const expiresAt = session.expires_at * 1000; // Convert to milliseconds
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

  return expiresAt < fiveMinutesFromNow;
}

/**
 * Refreshes the session using the refresh_token
 * Returns the new access_token or null if refresh failed
 */
async function refreshSession(): Promise<string | null> {
  const session = getStoredSession();
  if (!session?.refresh_token) {
    console.warn('[sessionManager] No refresh_token available');
    return null;
  }

  if (!browserSupabaseClient) {
    console.warn('[sessionManager] Supabase client not available');
    return null;
  }

  try {
    console.log('[sessionManager] Refreshing expired token...');

    const { data, error } = await browserSupabaseClient.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error('[sessionManager] Token refresh failed:', error.message);
      // If refresh fails, clear the session and force re-login
      clearSession();
      return null;
    }

    if (!data.session) {
      console.error('[sessionManager] No session returned from refresh');
      clearSession();
      return null;
    }

    // Store the new session
    storeSession(data.session, data.session.user);
    console.log('[sessionManager] Token refreshed successfully');

    return data.session.access_token;
  } catch (err: any) {
    console.error('[sessionManager] Unexpected error during token refresh:', err);
    clearSession();
    return null;
  }
}

/**
 * Gets a valid access token, refreshing it if necessary
 * Returns null if not authenticated or refresh fails
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = getStoredSession();

  if (!session?.access_token) {
    return null; // Not authenticated
  }

  // Check if token is expired or will expire soon
  if (isTokenExpired(session)) {
    console.log('[sessionManager] Token expired, refreshing...');
    return await refreshSession();
  }

  // Token is still valid
  return session.access_token;
}

/**
 * Legacy function for backwards compatibility
 * Use getValidAccessToken() instead for automatic refresh
 */
export function getAccessToken(): string | null {
  const session = getStoredSession();
  return session?.access_token ?? null;
}
