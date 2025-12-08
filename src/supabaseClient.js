import pkg from '@supabase/supabase-js';
const { createClient } = pkg;
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
const masked = (value) => value ? `${String(value).slice(0, 8)}${value.length > 8 ? '...' : ''}` : 'missing';
let supabaseAnon = null;
let supabaseService = null;
try {
    if (supabaseUrl && supabaseAnonKey) {
        supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        console.log('Supabase anon client ready:', masked(supabaseUrl));
    }
    if (supabaseUrl && supabaseServiceKey) {
        supabaseService = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
        console.log('Supabase service client ready:', masked(supabaseServiceKey));
    }
}
catch (error) {
    console.error('Error initializing Supabase clients:', error);
}
export const getSupabaseAnonClient = () => supabaseAnon;
export const getSupabaseServiceClient = () => supabaseService;
//# sourceMappingURL=supabaseClient.js.map