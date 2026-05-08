/**
 * Storage adapter for the Supabase JS client. Implements the
 * `{ getItem, setItem, removeItem }` interface that supabase-js expects on
 * `auth.storage`.
 *
 * Strategy:
 *   * Refresh tokens (the `*-refresh-token` keys) live in expo-secure-store
 *     (iOS Keychain / Android Keystore) — they're the long-lived auth secret
 *     and deserve hardware-backed storage where available.
 *   * Everything else (current session JSON, PKCE code verifier, etc.) lives
 *     in a dedicated MMKV instance so we don't pull in @react-native-async-storage.
 *
 * supabase-js calls these methods asynchronously, so we return Promises from
 * every method even when the underlying implementation is sync.
 */

import type { MMKVStorage } from '@/services/persistence/mmkvStorage';

interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

interface MMKVAuthRaw {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean;
}

interface MMKVAuthFactory {
  createMMKV(cfg: { id: string }): MMKVAuthRaw;
}

let mmkvAuth: MMKVAuthRaw | null = null;
let secureStore: SecureStoreLike | null = null;

function getMMKV(): MMKVAuthRaw | null {
  if (mmkvAuth) return mmkvAuth;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-mmkv') as Partial<MMKVAuthFactory>;
    if (typeof mod.createMMKV !== 'function') return null;
    mmkvAuth = mod.createMMKV({ id: 'sudoku-evolved-auth' });
    return mmkvAuth;
  } catch {
    return null;
  }
}

function getSecureStore(): SecureStoreLike | null {
  if (secureStore) return secureStore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStore = require('expo-secure-store') as SecureStoreLike;
    return secureStore;
  } catch {
    return null;
  }
}

function isRefreshToken(key: string): boolean {
  return key.endsWith('-refresh-token') || key.endsWith('refresh_token');
}

export interface SupabaseAuthAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class InMemoryFallback implements SupabaseAuthAdapter {
  private map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
}

class MMKVAuthAdapter implements SupabaseAuthAdapter {
  constructor(
    private kv: MMKVAuthRaw,
    private keychain: SecureStoreLike | null,
  ) {}

  async getItem(key: string): Promise<string | null> {
    if (this.keychain && isRefreshToken(key)) {
      try {
        return await this.keychain.getItemAsync(key);
      } catch {
        return null;
      }
    }
    const v = this.kv.getString(key);
    return v ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.keychain && isRefreshToken(key)) {
      try {
        await this.keychain.setItemAsync(key, value);
        return;
      } catch {
        // fall through to MMKV — better than losing the session entirely.
      }
    }
    this.kv.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (this.keychain && isRefreshToken(key)) {
      try {
        await this.keychain.deleteItemAsync(key);
      } catch {
        // ignore
      }
    }
    this.kv.remove(key);
  }
}

export function createSupabaseAuthAdapter(): SupabaseAuthAdapter {
  const kv = getMMKV();
  if (!kv) return new InMemoryFallback();
  return new MMKVAuthAdapter(kv, getSecureStore());
}

// re-export the type so test mocks can satisfy it.
export type { MMKVStorage };
