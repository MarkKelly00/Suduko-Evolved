import { create } from 'zustand';
import {
  STORAGE_KEYS,
  defaultSettings,
  migrateSettings,
  type NotificationPrefs,
  type SettingsStoreV1,
} from '@/services/persistence/schema';
import { getStorage } from '@/services/persistence/storage';
import { getSupabase } from '@/services/supabase/supabaseClient';

interface SettingsActions {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setColorblindMode: (v: boolean) => void;
  /** Apple Game Center opt-in. Setting to `true` is what the Settings
   *  toggle flow uses to trigger the system sign-in sheet via the
   *  service layer. Setting to `false` halts new submissions but does
   *  NOT sign the player out of Game Center (only iOS controls that). */
  setGameCenterOptIn: (v: boolean) => void;
  /** Update a single push-notification preference field (e.g. 'enabled',
   *  'challenges'). Persists locally AND syncs to cloud so the
   *  server-side `should_send_push()` check sees the latest value
   *  before its next trigger fires. */
  setNotificationPref: (key: keyof NotificationPrefs, v: boolean) => void;
  toggle: (key: ToggleableKey) => void;
  /** Re-read from disk. Call once at app boot. */
  hydrate: () => void;
  /** Wipe local progress + settings (developer / reset option). */
  resetAll: () => void;
}

type ToggleableKey =
  | 'soundEnabled'
  | 'hapticsEnabled'
  | 'reducedMotion'
  | 'highContrast'
  | 'colorblindMode'
  | 'gameCenterOptIn';

export type SettingsState = SettingsStoreV1 & SettingsActions;

const initial: SettingsStoreV1 = defaultSettings();

function persist(state: SettingsStoreV1): void {
  const payload: SettingsStoreV1 = {
    version: 1,
    soundEnabled: state.soundEnabled,
    hapticsEnabled: state.hapticsEnabled,
    reducedMotion: state.reducedMotion,
    highContrast: state.highContrast,
    colorblindMode: state.colorblindMode,
    gameCenterOptIn: state.gameCenterOptIn,
    notificationPrefs: state.notificationPrefs,
  };
  getStorage().set(STORAGE_KEYS.settings, payload);
}

/**
 * Best-effort cloud sync of notification prefs. Writes to
 * `profiles.notification_prefs` so the server-side
 * `should_send_push()` check the next trigger does sees the latest
 * values. The jsonb keys mirror the JS field names with snake_case so
 * SQL stays readable.
 */
async function syncNotificationPrefsToCloud(prefs: NotificationPrefs): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;
    if (!userId) return;
    const jsonbValue = {
      enabled: prefs.enabled,
      challenges: prefs.challenges,
      friend_requests: prefs.friendRequests,
      score_beats: prefs.scoreBeats,
      acceptances: prefs.acceptances,
      duel_invites: prefs.duelInvites,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { error } = await client
      .from('profiles')
      .update({ notification_prefs: jsonbValue })
      .eq('id', userId);
    if (error && __DEV__) {
      console.warn('[useSettingsStore.syncNotificationPrefs] failed:', error.message);
    }
  } catch (err) {
    if (__DEV__) console.warn('[useSettingsStore.syncNotificationPrefs] threw:', err);
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  setSoundEnabled: (v) => {
    set({ soundEnabled: v });
    persist(get());
  },
  setHapticsEnabled: (v) => {
    set({ hapticsEnabled: v });
    persist(get());
  },
  setReducedMotion: (v) => {
    set({ reducedMotion: v });
    persist(get());
  },
  setHighContrast: (v) => {
    set({ highContrast: v });
    persist(get());
  },
  setColorblindMode: (v) => {
    set({ colorblindMode: v });
    persist(get());
  },
  setGameCenterOptIn: (v) => {
    set({ gameCenterOptIn: v });
    persist(get());
  },
  setNotificationPref: (key, v) => {
    const next: NotificationPrefs = { ...get().notificationPrefs, [key]: v };
    set({ notificationPrefs: next });
    persist(get());
    // Fire-and-forget cloud sync. If the user has no session this
    // is a no-op; we'll re-sync on next sign-in via the auth boot.
    void syncNotificationPrefsToCloud(next);
  },
  toggle: (key) => {
    set({ [key]: !get()[key] } as Partial<SettingsState>);
    persist(get());
  },
  hydrate: () => {
    const raw = getStorage().get<unknown>(STORAGE_KEYS.settings, undefined);
    const migrated = migrateSettings(raw);
    set(migrated);
    // If migration upgraded the version, persist the new shape.
    persist(migrated);
  },
  resetAll: () => {
    const def = defaultSettings();
    set(def);
    persist(def);
    getStorage().remove(STORAGE_KEYS.progress);
  },
}));
