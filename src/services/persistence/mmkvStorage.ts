/**
 * MMKV-backed storage. Native module — only safe to import from app code, not
 * from Jest tests. Lazy-requires `react-native-mmkv` inside the constructor
 * so simply having this file in the import graph doesn't crash a Node test
 * runner.
 */

import type { Storage } from './storage';

interface MMKVLike {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  delete: (key: string) => void;
  clearAll: () => void;
  addOnValueChangedListener?: (
    cb: (changedKey: string) => void,
  ) => { remove: () => void };
}

export class MMKVStorage implements Storage {
  private mmkv: MMKVLike;
  private listeners = new Map<string, Set<(value: unknown) => void>>();
  private nativeListenerHandle: { remove: () => void } | null = null;

  constructor(id = 'sudoku-evolved') {
    // Lazy require so that the engine + persistence Jest tests, which only
    // ever instantiate `InMemoryStorage`, don't accidentally pull the native
    // module into the require graph.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkvModule = require('react-native-mmkv') as { MMKV: new (cfg: { id: string }) => MMKVLike };
    this.mmkv = new mmkvModule.MMKV({ id });
    if (typeof this.mmkv.addOnValueChangedListener === 'function') {
      this.nativeListenerHandle = this.mmkv.addOnValueChangedListener((changedKey) => {
        this.notify(changedKey);
      });
    }
  }

  get<T>(key: string, fallback: T): T {
    const raw = this.mmkv.getString(key);
    if (raw === undefined) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    this.mmkv.set(key, JSON.stringify(value));
    if (!this.nativeListenerHandle) {
      // No native listener available — fire JS-side fallback.
      this.notify(key);
    }
  }

  remove(key: string): void {
    this.mmkv.delete(key);
    if (!this.nativeListenerHandle) this.notify(key);
  }

  clear(): void {
    const keys = Array.from(this.listeners.keys());
    this.mmkv.clearAll();
    if (!this.nativeListenerHandle) for (const k of keys) this.notify(k);
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

  private notify(key: string): void {
    const set = this.listeners.get(key);
    if (!set) return;
    const value = this.mmkv.getString(key);
    let parsed: unknown = undefined;
    if (value !== undefined) {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }
    }
    for (const cb of set) cb(parsed);
  }
}
