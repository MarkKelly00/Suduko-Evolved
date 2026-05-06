/**
 * Storage abstraction. The app uses `MMKVStorage` (see `mmkvStorage.ts`); the
 * engine + Jest tests use `InMemoryStorage`. Both implement the same
 * `Storage` interface, so swapping is transparent to consumers.
 *
 * Values are JSON-serialized on write and parsed on read; non-JSON values
 * fall back to the caller's `fallback`.
 */

export interface Storage {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  /** Returns an unsubscribe function. */
  subscribe(key: string, cb: (value: unknown) => void): () => void;
}

export class InMemoryStorage implements Storage {
  private map = new Map<string, string>();
  private listeners = new Map<string, Set<(value: unknown) => void>>();

  get<T>(key: string, fallback: T): T {
    const raw = this.map.get(key);
    if (raw === undefined) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    this.map.set(key, JSON.stringify(value));
    this.notify(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
    this.notify(key, undefined);
  }

  clear(): void {
    const keys = Array.from(this.map.keys());
    this.map.clear();
    for (const k of keys) this.notify(k, undefined);
  }

  subscribe(key: string, cb: (value: unknown) => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(cb);
    return () => {
      set?.delete(cb);
    };
  }

  private notify(key: string, value: unknown): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const cb of set) cb(value);
  }
}

/**
 * Lazily-resolved app-wide storage. The first call instantiates the platform
 * implementation and the rest of the app reuses it. Tests can inject a custom
 * `InMemoryStorage` via `setStorage`.
 */
let _storage: Storage | null = null;

export function setStorage(storage: Storage): void {
  _storage = storage;
}

export function getStorage(): Storage {
  if (_storage) return _storage;
  // In Jest / non-RN environments, we never reach this branch because the
  // app boot sequence calls `setStorage(new MMKVStorage())` first. As a
  // belt-and-braces safety net we fall back to in-memory.
  _storage = new InMemoryStorage();
  return _storage;
}
