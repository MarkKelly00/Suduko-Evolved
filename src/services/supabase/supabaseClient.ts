/**
 * Singleton Supabase client. Imported by every service in this folder.
 *
 * IMPORTANT: `react-native-url-polyfill/auto` is imported at the app entry
 * (`App.tsx`) — supabase-js uses `URL` and `URLSearchParams` and on RN those
 * globals don't exist without the polyfill.
 *
 * If the app launches without the env vars wired up (e.g. running a fresh
 * clone without `.env`), `supabase` is `null`. Services check `getSupabase()`
 * and gracefully no-op so guest gameplay is never blocked.
 */

import { AppState } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseAuthAdapter } from './mmkvAuthAdapter';
import { getSupabaseEnv, isSupabaseConfigured } from './env';
import type { Database } from './supabaseTypes';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;
let appStateSub: { remove: () => void } | null = null;

export function getSupabase(): AppSupabaseClient | null {
  if (client) return client;
  if (!isSupabaseConfigured()) return null;

  // Lazy-require so a missing dep at install time doesn't crash module evaluation.
  let createClient: typeof import('@supabase/supabase-js').createClient;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    createClient = require('@supabase/supabase-js').createClient;
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[supabase] @supabase/supabase-js is not installed yet. Run `npm install` to enable the cloud layer.',
        err,
      );
    }
    return null;
  }

  const env = getSupabaseEnv();
  const storage = createSupabaseAuthAdapter();

  client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: {
      headers: { 'X-Client-Info': 'sudoku-evolved/0.1.0' },
    },
  });

  // Pause Supabase's auth refresh loop while the app is backgrounded so we
  // don't keep timers alive. `startAutoRefresh` is idempotent.
  appStateSub = AppState.addEventListener('change', (nextState) => {
    if (!client) return;
    if (nextState === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  });
  void client.auth.startAutoRefresh();

  return client;
}

/** Test-only: reset the singleton between cases. */
export function __resetSupabaseClient(): void {
  client = null;
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
}
