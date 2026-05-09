import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side anon Supabase client (server components, route handlers,
 * generateMetadata). Returns null if env vars are missing.
 *
 * NOTE: anon key only. The marketing site never holds a service-role key.
 */
export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-source': 'sudokuevolved-web' } },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
