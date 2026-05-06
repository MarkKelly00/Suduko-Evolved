import { InMemoryStorage } from '../storage';
import {
  STORAGE_KEYS,
  defaultProgress,
  defaultSettings,
  migrateProgress,
  migrateSettings,
} from '../schema';

describe('InMemoryStorage', () => {
  test('stores and retrieves JSON-serializable values', () => {
    const s = new InMemoryStorage();
    s.set('foo', { a: 1, b: 'two' });
    expect(s.get('foo', null)).toEqual({ a: 1, b: 'two' });
  });

  test('returns fallback when key is missing', () => {
    const s = new InMemoryStorage();
    expect(s.get('missing', { default: true })).toEqual({ default: true });
  });

  test('remove() deletes a key', () => {
    const s = new InMemoryStorage();
    s.set('k', 1);
    s.remove('k');
    expect(s.get('k', -1)).toBe(-1);
  });

  test('clear() empties everything', () => {
    const s = new InMemoryStorage();
    s.set('a', 1);
    s.set('b', 2);
    s.clear();
    expect(s.get('a', -1)).toBe(-1);
    expect(s.get('b', -1)).toBe(-1);
  });

  test('subscribe fires on set + remove', () => {
    const s = new InMemoryStorage();
    const seen: unknown[] = [];
    const unsub = s.subscribe('k', (v) => seen.push(v));
    s.set('k', 'first');
    s.set('k', 'second');
    s.remove('k');
    expect(seen).toEqual(['first', 'second', undefined]);
    unsub();
    s.set('k', 'after-unsub');
    expect(seen).toHaveLength(3);
  });
});

describe('schema migration', () => {
  test('progress: null/undefined → defaults', () => {
    const p1 = migrateProgress(undefined);
    const p2 = migrateProgress(null);
    expect(p1).toEqual(defaultProgress());
    expect(p2).toEqual(defaultProgress());
  });

  test('progress v0 → v1 wraps legacy shape', () => {
    const legacy = {
      levels: { 'world1-level-1': { stars: 2, crown: false, bestScore: 1500, bestTime: 240, completedAt: 1 } },
      totalXP: 200,
    };
    const migrated = migrateProgress(legacy);
    expect(migrated.version).toBe(1);
    expect(migrated.levels['world1-level-1']?.stars).toBe(2);
    expect(migrated.totalXP).toBe(200);
    expect(migrated.completedLevelIds).toEqual([]);
    // Defaults filled in for missing fields:
    expect(Array.isArray(migrated.unlockedLevels)).toBe(true);
  });

  test('progress v1 round-trips unchanged', () => {
    const v1 = defaultProgress();
    const migrated = migrateProgress(v1);
    expect(migrated).toEqual(v1);
  });

  test('settings: null/undefined → defaults', () => {
    expect(migrateSettings(undefined)).toEqual(defaultSettings());
  });

  test('settings v0 → v1 preserves toggles, fills missing', () => {
    const legacy = { soundEnabled: false, hapticsEnabled: false };
    const migrated = migrateSettings(legacy);
    expect(migrated.version).toBe(1);
    expect(migrated.soundEnabled).toBe(false);
    expect(migrated.hapticsEnabled).toBe(false);
    expect(migrated.reducedMotion).toBe(false);
    expect(migrated.highContrast).toBe(false);
    expect(migrated.colorblindMode).toBe(false);
  });
});

describe('round-trip via InMemoryStorage', () => {
  test('write a v0 blob, hydrate, get a v1 ProgressStore', () => {
    const s = new InMemoryStorage();
    const legacy = { totalXP: 42 };
    s.set(STORAGE_KEYS.progress, legacy);
    const raw = s.get<unknown>(STORAGE_KEYS.progress, undefined);
    const migrated = migrateProgress(raw);
    expect(migrated.version).toBe(1);
    expect(migrated.totalXP).toBe(42);
    s.set(STORAGE_KEYS.progress, migrated);
    const reloaded = migrateProgress(s.get<unknown>(STORAGE_KEYS.progress, undefined));
    expect(reloaded).toEqual(migrated);
  });
});
