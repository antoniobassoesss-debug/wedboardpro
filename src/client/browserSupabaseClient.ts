import { createClient } from '@supabase/supabase-js';

// Prefer Vite-prefixed vars; fall back to non-Vite names if present.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || (import.meta.env as any).SUPABASE_URL || (window as any).SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).SUPABASE_ANON_KEY ||
  (window as any).SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[browserSupabaseClient] Missing Supabase URL or anon key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const browserSupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // We persist our app session separately under `wedboarpro_session`,
          // but Supabase needs storage for PKCE/state + OAuth callback parsing.
          // Use PKCE so OAuth returns with ?code=... (more reliable than #access_token on Safari/iOS).
          flowType: 'pkce',
          persistSession: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    : null;