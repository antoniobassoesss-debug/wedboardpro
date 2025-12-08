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
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;