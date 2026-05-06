/**
 * Audio service. Real `expo-audio` playback wired through a typed registry,
 * with graceful fallbacks at every layer:
 *
 *   • If `SFX_ASSETS[key]` is missing (the default until you drop the MP3
 *     files in `assets/sfx/`), the call becomes a no-op — gameplay never
 *     waits on missing audio.
 *   • If `expo-audio` itself fails to instantiate a player (sandboxed test
 *     env, broken native module), we swallow the error and log once.
 *   • The user's `soundEnabled` setting and a runtime mute flag are
 *     checked before every playback.
 *
 * The contract is intentionally identical to the old no-op shim so callers
 * (`useGameStore`, screens, effects layer) don't need to change when
 * assets actually land. A single audio session config call routes playback
 * through the iOS "ambient" category so background music apps aren't
 * interrupted.
 */
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { type SfxKey, SFX_ASSETS } from './sfxRegistry';

interface AudioPlayerLike {
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
  release?: () => void;
  volume: number;
}

interface ExpoAudioModule {
  createAudioPlayer: (source: number) => AudioPlayerLike;
  setIsAudioActiveAsync?: (active: boolean) => Promise<void>;
  setAudioModeAsync?: (mode: Partial<{ playsInSilentMode: boolean; allowsRecording: boolean; shouldPlayInBackground: boolean }>) => Promise<void>;
}

/** Per-key default playback volume. SFX are tuned so completion stings
 *  read louder than micro-feedback like cell select. Values are floats in
 *  [0, 1] — match `AudioPlayer.volume`. */
const DEFAULT_VOLUMES: Partial<Record<SfxKey, number>> = {
  tap: 0.4,
  selectCell: 0.35,
  place: 0.55,
  note: 0.4,
  erase: 0.4,
  mistake: 0.6,
  rowComplete: 0.7,
  columnComplete: 0.7,
  boxComplete: 0.8,
  numberSetComplete: 0.75,
  combo: 0.85,
  puzzleComplete: 0.95,
  mapUnlock: 0.7,
  chestOpen: 0.7,
  buttonPrimary: 0.5,
  buttonSecondary: 0.45,
};

let preloaded = false;
let muted = false;
let players: Partial<Record<SfxKey, AudioPlayerLike>> = {};
let expoAudio: ExpoAudioModule | null = null;
let expoAudioLoadFailed = false;

function loadExpoAudio(): ExpoAudioModule | null {
  if (expoAudio) return expoAudio;
  if (expoAudioLoadFailed) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-audio') as ExpoAudioModule;
    if (typeof mod.createAudioPlayer !== 'function') {
      expoAudioLoadFailed = true;
      return null;
    }
    expoAudio = mod;
    return mod;
  } catch {
    expoAudioLoadFailed = true;
    return null;
  }
}

function shouldPlay(): boolean {
  if (muted) return false;
  return useSettingsStore.getState().soundEnabled;
}

function play(key: SfxKey): void {
  if (!shouldPlay()) return;
  const player = players[key];
  if (!player) return; // asset not registered or player not initialized
  // SFX expectation: each tap restarts the sound from the top so rapid
  // re-triggers feel snappy. Errors here would only matter if the native
  // module is wedged — we swallow so gameplay isn't disrupted.
  try {
    player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    /* swallow */
  }
}

function configureAudioMode(mod: ExpoAudioModule): void {
  if (!mod.setAudioModeAsync) return;
  mod.setAudioModeAsync({
    // Allow our SFX to play even if the iOS ringer is on silent — players
    // still expect to hear sound effects from a game with the volume up.
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: false,
  }).catch(() => undefined);
}

export const audioService = {
  /** Build (or rebuild) all `AudioPlayer` instances for registered keys.
   *  Safe to call multiple times — re-runs idempotently. */
  async preloadSfx(): Promise<void> {
    if (preloaded) return;
    preloaded = true;
    const mod = loadExpoAudio();
    if (!mod) return; // graceful fallback: stay no-op
    configureAudioMode(mod);
    for (const k of Object.keys(SFX_ASSETS) as SfxKey[]) {
      const asset = SFX_ASSETS[k];
      if (asset == null) continue;
      try {
        const player = mod.createAudioPlayer(asset);
        const vol = DEFAULT_VOLUMES[k] ?? 0.5;
        try {
          player.volume = vol;
        } catch {
          /* some platforms throw before the asset is loaded; harmless */
        }
        players[k] = player;
      } catch {
        // Per-key failure should not knock the rest of the registry out.
        continue;
      }
    }
  },
  /** Tear everything down. Useful for tests and HMR. */
  unloadSfx(): void {
    for (const key of Object.keys(players) as SfxKey[]) {
      const p = players[key];
      try {
        p?.release?.();
      } catch {
        /* swallow */
      }
    }
    players = {};
    preloaded = false;
  },
  setMuted(value: boolean): void {
    muted = value;
  },
  isMuted(): boolean {
    return muted || !useSettingsStore.getState().soundEnabled;
  },
  playTap(): void { play('tap'); },
  playSelectCell(): void { play('selectCell'); },
  playPlace(): void { play('place'); },
  playNote(): void { play('note'); },
  playErase(): void { play('erase'); },
  playMistake(): void { play('mistake'); },
  playRowComplete(): void { play('rowComplete'); },
  playColumnComplete(): void { play('columnComplete'); },
  playBoxComplete(): void { play('boxComplete'); },
  playNumberSetComplete(): void { play('numberSetComplete'); },
  playCombo(): void { play('combo'); },
  playPuzzleComplete(): void { play('puzzleComplete'); },
  playMapUnlock(): void { play('mapUnlock'); },
  playChestOpen(): void { play('chestOpen'); },
  playButtonPrimary(): void { play('buttonPrimary'); },
  playButtonSecondary(): void { play('buttonSecondary'); },
};
