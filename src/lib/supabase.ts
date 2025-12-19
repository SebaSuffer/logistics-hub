import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Durante el build, usar valores dummy si no hay variables de entorno
// Esto permite que el build complete, pero las operaciones fallarán en runtime si no están configuradas
const buildUrl = supabaseUrl || 'https://placeholder.supabase.co';
const buildKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.MODE !== 'production' || import.meta.env.SSR) {
    console.warn('Supabase credentials not found. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env');
  }
}

export const supabase = createClient(buildUrl, buildKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

