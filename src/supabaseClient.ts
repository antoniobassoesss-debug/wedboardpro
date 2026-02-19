import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseAnon: SupabaseClient | null = null;
let supabaseService: SupabaseClient | null = null;
let initialized = false;

function initClients() {
  if (initialized) return;
  initialized = true;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.warn('SUPABASE_URL is not set. Auth endpoints will be disabled.');
  }
  if (!supabaseAnonKey) {
    console.warn('SUPABASE_ANON_KEY is not set. Public Supabase client unavailable.');
  }
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin Supabase client unavailable.');
  }

  try {
    if (supabaseUrl && supabaseAnonKey) {
      supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      console.log('Supabase anon client ready');
    }
    if (supabaseUrl && supabaseServiceKey) {
      supabaseService = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
      console.log('Supabase service client ready');
    }
  } catch (error) {
    console.error('Error initializing Supabase clients:', error);
  }
}

export const getSupabaseAnonClient = () => { initClients(); return supabaseAnon; };
export const getSupabaseServiceClient = () => { initClients(); return supabaseService; };
