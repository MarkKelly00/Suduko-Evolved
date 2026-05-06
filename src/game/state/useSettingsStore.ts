import { create } from 'zustand';
import {
  STORAGE_KEYS,
  defaultSettings,
  migrateSettings,
  type SettingsStoreV1,
} from '@/services/persistence/schema';
import { getStorage } from '@/services/persistence/storage';

interface SettingsActions {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setColorblindMode: (v: boolean) => void;
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
  | 'colorblindMode';

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
  };
  getStorage().set(STORAGE_KEYS.settings, payload);
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
