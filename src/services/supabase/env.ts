/**
 * Centralized access to EXPO_PUBLIC_* environment variables consumed by the
 * Supabase + auth layer.
 *
 * EXPO_PUBLIC_* values are substituted at build time by `babel-preset-expo`
 * via `babel-plugin-transform-inline-environment-variables`. That plugin
 * replaces ONLY static dot-notation references — `process.env.EXPO_PUBLIC_X`
 * — with the literal `.env` value. Bracket-notation / dynamic-name accesses
 * (`process.env[name]`) are NOT replaced and are read from an empty runtime
 * object in production bundles produced by `expo export:embed` (the path
 * used by `Product → Archive` and EAS Build). The dev server polyfills
 * `process.env` at runtime, which is why bracket access happens to work
 * locally but silently breaks in TestFlight / App Store builds.
 *
 * Therefore every read in this file MUST be a static dot-notation access.
 * Do not refactor into a helper that takes a name string at runtime.
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

/** Treat empty strings (e.g. `EXPO_PUBLIC_X=` in `.env`) as "not set". */
function nonEmpty(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getSupabaseEnv(): SupabaseEnv {
  if (cached) return cached;

  // STATIC accesses only — see file header. Each `process.env.EXPO_PUBLIC_*`
  // here is replaced by Metro/babel with a string literal at bundle time.
  const supabaseUrl = nonEmpty(process.env.EXPO_PUBLIC_SUPABASE_URL) ?? '';
  const supabaseAnonKey =
    nonEmpty(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ?? '';
  const googleIosClientId =
    nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ?? null;
  const googleWebClientId =
    nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ?? null;

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
