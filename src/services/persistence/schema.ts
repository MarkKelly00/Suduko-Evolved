/**
 * Versioned persistence schema. Bumping `SCHEMA_VERSION` and adding a case to
 * `migrateProgress` / `migrateSettings` lets the app evolve the on-disk shape
 * without losing player data.
 */

export const SCHEMA_VERSION = 1 as const;

export const STORAGE_KEYS = {
  progress: 'progress',
  settings: 'settings',
  pendingSubmissions: 'pendingSubmissions',
  deadLetterSubmissions: 'deadLetterSubmissions',
} as const;

/** Per-account marker that local→cloud migration has run on this device.
 *  Keyed by user id so a logout/login as the same account is idempotent. */
export function lastSyncedKey(userId: string): string {
  return `lastSyncedFor:${userId}`;
}

// ----- Progress ------------------------------------------------------------

export interface ProgressLevelEntry {
  stars: 1 | 2 | 3;
  crown: boolean;
  bestScore: number;
  /** Best clear time in seconds. */
  bestTime: number;
  /** Epoch ms of best run. */
  completedAt: number;
}

export interface TimeTrialBest {
  score: number;
  /** Best time (or last-run time if score is the primary metric) in seconds. */
  time: number;
  date: number;
}

export interface ProgressStoreV1 {
  version: 1;
  levels: Record<string, ProgressLevelEntry>;
  totalXP: number;
  currentStreak: number;
  lastPlayedLevel: string | null;
  unlockedLevels: string[];
  timeTrialBests: Record<string, TimeTrialBest>;
  completedLevelIds: string[];
  /** True once the player has Begun OR Skipped the one-time first-launch
   *  tutorial modal. Persists forever after. New field; existing v1 saves
   *  without this key get the default `false` via `migrateProgress` and will
   *  see the modal once on next launch. */
  hasSeenTutorial: boolean;
}

export function defaultProgress(): ProgressStoreV1 {
  return {
    version: 1,
    levels: {},
    totalXP: 0,
    currentStreak: 0,
    lastPlayedLevel: null,
    unlockedLevels: ['world1-level-1'],
    timeTrialBests: {},
    completedLevelIds: [],
    hasSeenTutorial: false,
  };
}

export function migrateProgress(raw: unknown): ProgressStoreV1 {
  if (raw == null || typeof raw !== 'object') return defaultProgress();
  const r = raw as { version?: number; [k: string]: unknown };
  const version = r.version;
  if (version === 1) {
    // Already current. Fill any missing fields from defaults so reads of
    // newly-introduced (but compatible) fields don't return undefined.
    return { ...defaultProgress(), ...(raw as Partial<ProgressStoreV1>) };
  }
  if (version === undefined || version === 0) {
    // v0 → v1: legacy shape didn't carry `version`/`completedLevelIds`.
    // Wrap and forward whatever fields we can.
    const base = defaultProgress();
    const partial = raw as Partial<ProgressStoreV1>;
    return {
      ...base,
      ...partial,
      version: 1,
      completedLevelIds: partial.completedLevelIds ?? [],
    };
  }
  // Unknown future version — fall back to defaults rather than crash.
  return defaultProgress();
}

// ----- Settings -----------------------------------------------------------

export interface SettingsStoreV1 {
  version: 1;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorblindMode: boolean;
}

export function defaultSettings(): SettingsStoreV1 {
  return {
    version: 1,
    soundEnabled: true,
    hapticsEnabled: true,
    reducedMotion: false,
    highContrast: false,
    colorblindMode: false,
  };
}

export function migrateSettings(raw: unknown): SettingsStoreV1 {
  if (raw == null || typeof raw !== 'object') return defaultSettings();
  const r = raw as { version?: number; [k: string]: unknown };
  const version = r.version;
  if (version === 1) {
    return { ...defaultSettings(), ...(raw as Partial<SettingsStoreV1>) };
  }
  if (version === undefined || version === 0) {
    const base = defaultSettings();
    const partial = raw as Partial<SettingsStoreV1>;
    return { ...base, ...partial, version: 1 };
  }
  return defaultSettings();
}
