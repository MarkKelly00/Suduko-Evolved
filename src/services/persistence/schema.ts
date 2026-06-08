/**
 * Versioned persistence schema. Bumping `SCHEMA_VERSION` and adding a case to
 * `migrateProgress` / `migrateSettings` lets the app evolve the on-disk shape
 * without losing player data.
 */

export const SCHEMA_VERSION = 2 as const;

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

export interface ProgressStoreV2 {
  version: 2;
  levels: Record<string, ProgressLevelEntry>;
  totalXP: number;
  currentStreak: number;
  lastPlayedLevel: string | null;
  unlockedLevels: string[];
  /** Worlds the player has opened. `world1` is always present; `world2`
   *  (Astral Nexus) is added once Logic Garden's level 30 is completed. This
   *  is DERIVED from `completedLevelIds` and repaired by the progress store on
   *  every hydrate / record / cloud-restore via `repairUnlockedWorlds`, so it
   *  can never desync — it's persisted only so reads are cheap and offline-safe.
   *  New in schema v2; older saves get `['world1']` here via `migrateProgress`
   *  and are then repaired on first hydrate. */
  unlockedWorlds: string[];
  timeTrialBests: Record<string, TimeTrialBest>;
  completedLevelIds: string[];
  /** True once the player has Begun OR Skipped the one-time first-launch
   *  tutorial modal. Persists forever after. */
  hasSeenTutorial: boolean;
}

/** Back-compat alias — the live persisted shape. */
export type ProgressStore = ProgressStoreV2;

export function defaultProgress(): ProgressStoreV2 {
  return {
    version: 2,
    levels: {},
    totalXP: 0,
    currentStreak: 0,
    lastPlayedLevel: null,
    unlockedLevels: ['world1-level-1'],
    unlockedWorlds: ['world1'],
    timeTrialBests: {},
    completedLevelIds: [],
    hasSeenTutorial: false,
  };
}

/**
 * Migrate a raw persisted blob up to the current schema (v2).
 *
 * NON-DESTRUCTIVE: existing levels, stars, crowns, unlocked levels, XP, streak,
 * and the current level are always preserved. New fields are filled from
 * defaults. The `unlockedWorlds` array is added with a safe `['world1']` default
 * and then re-derived/repaired from `completedLevelIds` by the progress store on
 * hydrate, so a returning player who had cleared World 1 sees World 2 unlock
 * automatically without a destructive reset.
 */
export function migrateProgress(raw: unknown): ProgressStoreV2 {
  if (raw == null || typeof raw !== 'object') return defaultProgress();
  const r = raw as { version?: number; [k: string]: unknown };
  const version = r.version;
  const base = defaultProgress();

  if (version === 2) {
    // Already current. Fill any missing fields from defaults.
    return { ...base, ...(raw as Partial<ProgressStoreV2>) };
  }
  if (version === 1) {
    // v1 → v2: identical shape plus `unlockedWorlds`. Preserve everything;
    // seed `unlockedWorlds` with the safe default (store repairs from
    // completedLevelIds on hydrate).
    const partial = raw as Partial<ProgressStoreV2>;
    return {
      ...base,
      ...partial,
      version: 2,
      unlockedWorlds: partial.unlockedWorlds ?? ['world1'],
    };
  }
  if (version === undefined || version === 0) {
    // v0 → v2: legacy shape didn't carry `version`/`completedLevelIds`.
    const partial = raw as Partial<ProgressStoreV2>;
    return {
      ...base,
      ...partial,
      version: 2,
      completedLevelIds: partial.completedLevelIds ?? [],
      unlockedWorlds: partial.unlockedWorlds ?? ['world1'],
    };
  }
  // Unknown future version — fall back to defaults rather than crash.
  return defaultProgress();
}

// ----- Settings -----------------------------------------------------------

/**
 * Per-trigger push notification opt-ins. Mirrors the columns of
 * `profiles.notification_prefs` (server-side). All default to true so
 * a fresh install gets the full social loop; the user can mute any
 * trigger individually in Settings.
 */
export interface NotificationPrefs {
  /** Master gate. When false, NO push notification is sent regardless
   *  of per-kind toggles below. */
  enabled: boolean;
  challenges: boolean;
  friendRequests: boolean;
  scoreBeats: boolean;
  acceptances: boolean;
  duelInvites: boolean;
}

export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    enabled: true,
    challenges: true,
    friendRequests: true,
    scoreBeats: true,
    acceptances: true,
    duelInvites: true,
  };
}

export interface SettingsStoreV1 {
  version: 1;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorblindMode: boolean;
  /** Apple Game Center opt-in. False by default — the user must
   *  explicitly toggle this on in Settings before we trigger any
   *  GameKit auth or submission. The flag persists across app restarts;
   *  flipping it off stops new submissions but doesn't sign the player
   *  out of Game Center (only Apple controls that). */
  gameCenterOptIn: boolean;
  /** Per-trigger push notification preferences. The store mirrors the
   *  server's `profiles.notification_prefs` jsonb column so the SQL
   *  trigger `should_send_push()` can short-circuit without an extra
   *  round-trip. Changes here sync to cloud on save. */
  notificationPrefs: NotificationPrefs;
}

export function defaultSettings(): SettingsStoreV1 {
  return {
    version: 1,
    soundEnabled: true,
    hapticsEnabled: true,
    reducedMotion: false,
    highContrast: false,
    colorblindMode: false,
    gameCenterOptIn: false,
    notificationPrefs: defaultNotificationPrefs(),
  };
}

export function migrateSettings(raw: unknown): SettingsStoreV1 {
  if (raw == null || typeof raw !== 'object') return defaultSettings();
  const r = raw as { version?: number; [k: string]: unknown };
  const version = r.version;
  if (version === 1) {
    const base = defaultSettings();
    const partial = raw as Partial<SettingsStoreV1>;
    // Deep-merge notificationPrefs so older v1 payloads that pre-date
    // this field still get a sensible default.
    return {
      ...base,
      ...partial,
      notificationPrefs: {
        ...base.notificationPrefs,
        ...(partial.notificationPrefs ?? {}),
      },
    };
  }
  if (version === undefined || version === 0) {
    const base = defaultSettings();
    const partial = raw as Partial<SettingsStoreV1>;
    return {
      ...base,
      ...partial,
      version: 1,
      notificationPrefs: {
        ...base.notificationPrefs,
        ...(partial.notificationPrefs ?? {}),
      },
    };
  }
  return defaultSettings();
}
