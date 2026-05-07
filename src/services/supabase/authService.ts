/**
 * Auth orchestration. Wraps supabase-js auth with Apple + Google providers
 * and exposes the small surface that `useAuthStore` consumes.
 *
 * Apple/Google native modules are required lazily — guests should be able
 * to launch the app even if the modules failed to install.
 */

import { Platform } from 'react-native';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

import { getSupabase } from './supabaseClient';
import { getProfile } from './profileService';
import { getSupabaseEnv } from './env';
import type { Profile } from './supabaseTypes';

export type AuthUser = User;
export type AuthSession = Session;
export type AuthEvent = AuthChangeEvent;

let initialized = false;

export async function initialize(): Promise<AuthSession | null> {
  if (initialized) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  }
  initialized = true;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthStateChange(
  cb: (event: AuthEvent, session: AuthSession | null) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  const sub = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => sub.data.subscription.unsubscribe();
}

/* -------------------------- Apple Sign-In ----------------------------- */

interface AppleAuthModule {
  signInAsync(opts: {
    requestedScopes?: number[];
    nonce?: string;
  }): Promise<{
    identityToken: string | null;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
    email?: string | null;
    user?: string;
  }>;
  AppleAuthenticationScope: { FULL_NAME: number; EMAIL: number };
  isAvailableAsync(): Promise<boolean>;
}

interface CryptoModule {
  randomUUID?: () => string;
  digestStringAsync?: (alg: string, data: string) => Promise<string>;
  CryptoDigestAlgorithm?: { SHA256: string };
}

function loadAppleAuth(): AppleAuthModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-apple-authentication') as AppleAuthModule;
  } catch {
    return null;
  }
}

function loadCrypto(): CryptoModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-crypto') as CryptoModule;
  } catch {
    return null;
  }
}

async function generateNonce(): Promise<{ raw: string; hashed: string }> {
  const crypto = loadCrypto();
  const rand =
    crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const raw = rand.replace(/-/g, '') + Math.random().toString(36).slice(2);
  if (crypto?.digestStringAsync && crypto.CryptoDigestAlgorithm) {
    const hashed = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, raw);
    return { raw, hashed };
  }
  // Fallback: send the raw nonce (Supabase still validates it; not ideal).
  return { raw, hashed: raw };
}

export async function signInWithApple(): Promise<AuthSession> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const apple = loadAppleAuth();
  if (!apple) throw new Error('Apple Sign-In is unavailable on this platform.');
  const available = await apple.isAvailableAsync();
  if (!available) throw new Error('Apple Sign-In is not available on this device.');

  const { raw, hashed } = await generateNonce();
  const result = await apple.signInAsync({
    requestedScopes: [
      apple.AppleAuthenticationScope.FULL_NAME,
      apple.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });
  if (!result.identityToken) throw new Error('Apple did not return an identity token.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: result.identityToken,
    nonce: raw,
  });
  if (error || !data.session) throw error ?? new Error('Apple sign-in failed.');

  // First-login-only display name.
  const fullName = [result.fullName?.givenName, result.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) {
    await supabase
      .from('profiles')
      .update({ display_name: fullName })
      .eq('id', data.user!.id)
      .is('deleted_at', null);
  }

  return data.session;
}

/* -------------------------- Google Sign-In ---------------------------- */

interface GoogleSignInModule {
  configure(opts: { iosClientId?: string; webClientId?: string }): void;
  hasPlayServices?: () => Promise<boolean>;
  signIn(): Promise<{ data?: { idToken: string | null } } | { idToken: string | null }>;
  signOut(): Promise<void>;
}

let googleConfigured = false;
function loadGoogleSignIn(): GoogleSignInModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin') as {
      GoogleSignin?: GoogleSignInModule;
    };
    return mod.GoogleSignin ?? null;
  } catch {
    return null;
  }
}

function ensureGoogleConfigured(): GoogleSignInModule {
  const google = loadGoogleSignIn();
  if (!google) throw new Error('Google Sign-In native module is not installed.');
  if (googleConfigured) return google;
  const env = getSupabaseEnv();
  google.configure({
    iosClientId: env.googleIosClientId ?? undefined,
    webClientId: env.googleWebClientId ?? undefined,
  });
  googleConfigured = true;
  return google;
}

export async function signInWithGoogle(): Promise<AuthSession> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const google = ensureGoogleConfigured();
  if (Platform.OS === 'android' && google.hasPlayServices) {
    const ok = await google.hasPlayServices();
    if (!ok) throw new Error('Google Play Services is required.');
  }
  const result = await google.signIn();
  // The library returns either { data: { idToken } } (v13+) or { idToken } (older).
  const idToken =
    'data' in result ? result.data?.idToken : (result as { idToken?: string | null }).idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error || !data.session) throw error ?? new Error('Google sign-in failed.');
  return data.session;
}

/* ---------------------------- Sign Out -------------------------------- */

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
  // Best-effort Google sign-out so the next sign-in lets the user pick an account.
  try {
    loadGoogleSignIn()?.signOut();
  } catch {
    // ignore
  }
}

/* ------------------------- ensureProfile ------------------------------ */

export interface EnsureProfileResult {
  profile: Profile;
  isOnboarding: boolean;
}

/**
 * Make sure the authenticated user has a profile row. The DB trigger
 * `handle_new_user` creates one on signup, but if it failed (or this is
 * an existing user pre-trigger) we upsert here.
 *
 * Returns `isOnboarding: true` when the profile lacks both username and
 * display_name — the UI uses this to route to EditProfile after sign-in.
 */
export async function ensureProfile(user: AuthUser): Promise<EnsureProfileResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  let profile = await getProfile(user.id);
  if (!profile) {
    const seed = {
      id: user.id,
      display_name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        (user.email ? user.email.split('@')[0] : null) ??
        null,
    };
    const { data, error } = await supabase
      .from('profiles')
      .upsert(seed, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    profile = data as Profile;
  }

  const isOnboarding =
    !profile.username || !profile.display_name || profile.display_name.length === 0;
  return { profile, isOnboarding };
}

/* ---------------------- Account Deletion (scaffold) -------------------- */

export async function deleteAccount(): Promise<void> {
  // Scaffold: surface "Coming soon" in the UI. Real implementation will hit
  // an Edge Function that soft-deletes the profile row and revokes session.
  throw new Error('Account deletion is not yet available.');
}
