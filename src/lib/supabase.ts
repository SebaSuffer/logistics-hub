import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Crear cliente solo si tenemos las credenciales
// Durante el build, si no hay variables, creamos un cliente dummy
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} else {
  // Durante el build, usar valores placeholder válidos
  // Esto permite que el build complete sin errores
  const placeholderUrl = 'https://placeholder.supabase.co';
  const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder';
  
  supabase = createClient(placeholderUrl, placeholderKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  if (typeof window !== 'undefined') {
    console.warn('Supabase credentials not found. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in environment variables.');
  }
}

export { supabase };

