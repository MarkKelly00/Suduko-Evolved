/**
 * Centralized access to EXPO_PUBLIC_* environment variables consumed by the
 * Supabase + auth layer. EXPO_PUBLIC_ vars are inlined into the bundle by
 * Metro at build time, so this module is safe to import from anywhere.
 *
 * In development the missing-var error is loud and immediate. In production
 * we log a warning and let the call sites no-op so the app still launches as
 * a guest session.
 */

interface SupabaseEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleIosClientId: string | null;
  googleWebClientId: string | null;
}

let cached: SupabaseEnv | null = null;

function read(name: string): string | undefined {
  const value = (process.env as Record<string, string | undefined>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getSupabaseEnv(): SupabaseEnv {
  if (cached) return cached;
  const supabaseUrl = read('EXPO_PUBLIC_SUPABASE_URL') ?? '';
  const supabaseAnonKey = read('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '';
  const googleIosClientId = read('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID') ?? null;
  const googleWebClientId = read('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') ?? null;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (__DEV__) {
      console.warn(
        '[supabase/env] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing. ' +
          'Copy .env.example to .env and fill in. Auth + cloud features will be disabled until configured.',
      );
    }
  }

  cached = { supabaseUrl, supabaseAnonKey, googleIosClientId, googleWebClientId };
  return cached;
}

export function isSupabaseConfigured(): boolean {
  const env = getSupabaseEnv();
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}
