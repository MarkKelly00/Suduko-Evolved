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

// Long enough that the iCloud "sign in to your iPhone" setup flow (if the
// simulator has no iCloud session) doesn't trip it during normal use, but
// short enough that a truly-stuck signInAsync doesn't leave the spinner up
// forever. Real-device flows complete in well under a minute.
const APPLE_SIGN_IN_TIMEOUT_MS = 120_000;

export async function signInWithApple(): Promise<AuthSession> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const apple = loadAppleAuth();
  if (!apple) throw new Error('Apple Sign-In is unavailable on this platform.');
  const available = await apple.isAvailableAsync();
  if (!available) throw new Error('Apple Sign-In is not available on this device.');

  const { raw, hashed } = await generateNonce();
  if (__DEV__) console.warn('[Apple] calling signInAsync…');
  const signInPromise = apple
    .signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    })
    .then((res) => {
      if (__DEV__)
        console.warn('[Apple] signInAsync resolved', {
          hasToken: !!res.identityToken,
          hasUser: !!res.user,
          email: res.email ?? null,
        });
      return res;
    })
    .catch((err: unknown) => {
      if (__DEV__) console.warn('[Apple] signInAsync rejected', err);
      throw err;
    });

  // Defensive timeout — signInAsync can hang on the simulator without an
  // iCloud session and never resolve/reject. Without this the UI button
  // would spin indefinitely.
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            'Apple Sign-In timed out. On the iOS simulator, sign in to iCloud (Settings → Sign in to your iPhone) or test on a physical device.',
          ),
        ),
      APPLE_SIGN_IN_TIMEOUT_MS,
    ),
  );
  const result = await Promise.race([signInPromise, timeoutPromise]);
  if (!result.identityToken) throw new Error('Apple did not return an identity token.');

  if (__DEV__) console.warn('[Apple] exchanging identity token with Supabase…');
  // We bypass supabase-js's signInWithIdToken because its internal fetch
  // hangs on iOS Simulator with no resolution (verified: same endpoint
  // responds in <300ms via curl from the host Mac, but the supabase-js
  // wrapper never resolves). A plain fetch + setSession does the same
  // server work and is reliable across simulator / device / web.
  const env = getSupabaseEnv();
  const tokenUrl = `${env.supabaseUrl}/auth/v1/token?grant_type=id_token`;
  const exchangeController = new AbortController();
  const timeoutHandle = setTimeout(() => exchangeController.abort(), 30_000);
  let exchangeResp: Response;
  try {
    exchangeResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'apple',
        id_token: result.identityToken,
        nonce: raw,
      }),
      signal: exchangeController.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new Error(
        'Supabase token exchange timed out after 30s. Check network reachability and that Apple is enabled at Supabase → Authentication → Providers.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }
  if (__DEV__) console.warn('[Apple] exchange status', exchangeResp.status);
  const payload = (await exchangeResp.json()) as {
    access_token?: string;
    refresh_token?: string;
    user?: AuthUser;
    msg?: string;
    error?: string;
    error_description?: string;
  };
  if (!exchangeResp.ok) {
    const message = payload.msg ?? payload.error_description ?? payload.error ?? 'Unknown error';
    if (__DEV__) console.warn('[Apple] supabase exchange error', payload);
    throw new Error(`Supabase: ${message}`);
  }
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error('Supabase: malformed token response.');
  }
  // Install the session into the supabase client so subsequent calls are
  // authenticated. setSession also persists into our MMKV adapter.
  const { data, error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (__DEV__) {
    if (error) console.warn('[Apple] setSession error', error);
    else console.warn('[Apple] setSession ok', { userId: data.user?.id });
  }
  if (error || !data.session) {
    throw new Error(`Supabase: ${error?.message ?? 'failed to install session'}`);
  }

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

/**
 * Decode a base64url-encoded JWT segment to a UTF-8 string. Prefers the
 * platform `atob` (present in Hermes on RN 0.74+), with a small pure-JS
 * fallback so this stays safe across runtimes without a base64 polyfill.
 */
function decodeBase64Url(segment: string): string {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad === 0 ? b64 : b64 + '='.repeat(4 - pad);

  if (typeof atob === 'function') {
    return atob(padded);
  }

  const ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < padded.length; i++) {
    const ch = padded.charAt(i);
    if (ch === '=') break;
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

/**
 * Pull the `nonce` claim out of a Google id_token without verifying its
 * signature (Supabase verifies on its side). Required because the native
 * Google Sign-In SDK auto-generates a nonce and embeds it in the id_token
 * but the @react-native-google-signin v14 JS API does not expose it. If
 * we forward the id_token to Supabase without a matching `nonce` field,
 * GoTrue rejects the request with `error: 'invalid request',
 * error_description: 'Passed nonce and nonce in id_token should either
 * both exist or not.'`.
 *
 * Google embeds the raw (un-hashed) nonce — unlike Apple, which embeds
 * the SHA-256 hash — so we can pass the extracted value to GoTrue
 * verbatim and the symmetry check passes.
 */
function extractNonceFromIdToken(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const json = decodeBase64Url(parts[1]);
    const payload = JSON.parse(json) as { nonce?: unknown };
    return typeof payload.nonce === 'string' && payload.nonce.length > 0
      ? payload.nonce
      : null;
  } catch {
    return null;
  }
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

  if (__DEV__) console.warn('[Google] calling signIn…');
  let result: Awaited<ReturnType<GoogleSignInModule['signIn']>>;
  try {
    result = await google.signIn();
  } catch (err) {
    if (__DEV__) console.warn('[Google] signIn rejected', err);
    throw err;
  }
  if (__DEV__) {
    const hasData = 'data' in result;
    const tokenPresent = hasData
      ? !!(result as { data?: { idToken?: string | null } }).data?.idToken
      : !!(result as { idToken?: string | null }).idToken;
    console.warn('[Google] signIn resolved', {
      shape: hasData ? 'v13+ ({data})' : 'legacy',
      type: (result as { type?: string }).type ?? 'n/a',
      hasIdToken: tokenPresent,
    });
  }

  // The library returns either { data: { idToken } } (v13+) or { idToken } (older).
  const idToken =
    'data' in result ? result.data?.idToken : (result as { idToken?: string | null }).idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');

  // The native iOS Google Sign-In SDK ("Original" flow) auto-generates a
  // nonce, embeds the SHA-256 hash in the id_token's `nonce` claim, and
  // never surfaces the raw value to JS. There is no API in
  // `@react-native-google-signin` v14 to inject our own nonce on the
  // Original flow (only the licensed "Universal Sign-In" module, which
  // we don't have, exposes one). Supabase GoTrue would otherwise SHA-256
  // our nonce and compare to the claim → guaranteed mismatch.
  //
  // The official Supabase iOS Google guide tells us to enable the
  // "Skip nonce check" toggle on the project's Google provider for this
  // exact case. With Skip nonce check on, the request must NOT pass a
  // `nonce` field; we just send the id_token. We still extract the
  // claim for diagnostics so future failures are easier to triage.
  const idTokenNonce = extractNonceFromIdToken(idToken);
  if (__DEV__) {
    console.warn(
      '[Google] id_token nonce (diagnostic only, not sent to Supabase)',
      idTokenNonce ? `<${idTokenNonce.length} chars>` : null,
    );
  }

  if (__DEV__) console.warn('[Google] exchanging identity token with Supabase…');
  // We bypass supabase-js's signInWithIdToken for the same reason as the
  // Apple flow above: the wrapper's internal fetch hangs on iOS Simulator
  // with no resolution. The plain fetch + setSession path performs the
  // same server work and is reliable across simulator, device, and web.
  const env = getSupabaseEnv();
  const tokenUrl = `${env.supabaseUrl}/auth/v1/token?grant_type=id_token`;
  const exchangeController = new AbortController();
  const timeoutHandle = setTimeout(() => exchangeController.abort(), 30_000);
  let exchangeResp: Response;
  try {
    exchangeResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'google',
        id_token: idToken,
      }),
      signal: exchangeController.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new Error(
        'Supabase token exchange timed out after 30s. Check network reachability and that Google is enabled at Supabase → Authentication → Providers.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }
  if (__DEV__) console.warn('[Google] exchange status', exchangeResp.status);
  const payload = (await exchangeResp.json()) as {
    access_token?: string;
    refresh_token?: string;
    user?: AuthUser;
    msg?: string;
    error?: string;
    error_description?: string;
  };
  if (!exchangeResp.ok) {
    const message = payload.msg ?? payload.error_description ?? payload.error ?? 'Unknown error';
    if (__DEV__) console.warn('[Google] supabase exchange error', payload);
    throw new Error(`Supabase: ${message}`);
  }
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error('Supabase: malformed token response.');
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (__DEV__) {
    if (error) console.warn('[Google] setSession error', error);
    else console.warn('[Google] setSession ok', { userId: data.user?.id });
  }
  if (error || !data.session) {
    throw new Error(`Supabase: ${error?.message ?? 'failed to install session'}`);
  }
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

/* ------------------------- Delete account ----------------------------- */

/**
 * Permanently deletes the authenticated user's account by calling the
 * `delete_my_account` SECURITY DEFINER RPC. The RPC cascades through
 * public.profiles (deleting all scores, challenges, friendships) and
 * removes the auth.users row, then we sign out locally to clean session
 * state.
 *
 * Required for App Store compliance (App Store Review Guideline 5.1.1(v)).
 */
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  // Tokens are already invalidated server-side; this just clears local
  // storage and triggers onAuthStateChange listeners.
  try {
    await supabase.auth.signOut();
  } catch {
    // The auth.users row is already gone, so signOut may 401 — that's fine.
  }
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

/* (deleteAccount lives above, next to signOut.) */
