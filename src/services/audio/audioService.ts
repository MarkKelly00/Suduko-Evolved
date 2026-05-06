/**
 * Audio service. Phase 3 ships no asset files yet; every play* method is a
 * no-op that respects `useSettingsStore.soundEnabled`. Phase 4 will swap in
 * real `expo-audio` players keyed by `sfxRegistry.SFX_ASSETS`.
 *
 * The contract is intentionally stable so callers (`useGameStore`, screens)
 * don't need to change when audio lands.
 */
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { type SfxKey, SFX_ASSETS } from './sfxRegistry';

let preloaded = false;
let muted = false;

function shouldPlay(): boolean {
  if (muted) return false;
  return useSettingsStore.getState().soundEnabled;
}

async function play(_key: SfxKey): Promise<void> {
  if (!shouldPlay()) return;
  const asset = SFX_ASSETS[_key];
  if (asset == null) return; // no asset yet — silent
  // Phase 4: load + play via expo-audio. Wrapped in try/catch then.
}

export const audioService = {
  async preloadSfx(): Promise<void> {
    if (preloaded) return;
    preloaded = true;
    // Phase 4 will preload all assets here.
  },
  setMuted(value: boolean): void {
    muted = value;
  },
  isMuted(): boolean {
    return muted || !useSettingsStore.getState().soundEnabled;
  },
  // Convenience methods named per spec
  playTap(): void { void play('tap'); },
  playSelectCell(): void { void play('selectCell'); },
  playPlace(): void { void play('place'); },
  playNote(): void { void play('note'); },
  playErase(): void { void play('erase'); },
  playMistake(): void { void play('mistake'); },
  playRowComplete(): void { void play('rowComplete'); },
  playColumnComplete(): void { void play('columnComplete'); },
  playBoxComplete(): void { void play('boxComplete'); },
  playNumberSetComplete(): void { void play('numberSetComplete'); },
  playCombo(): void { void play('combo'); },
  playPuzzleComplete(): void { void play('puzzleComplete'); },
  playMapUnlock(): void { void play('mapUnlock'); },
  playChestOpen(): void { void play('chestOpen'); },
  playButtonPrimary(): void { void play('buttonPrimary'); },
  playButtonSecondary(): void { void play('buttonSecondary'); },
};
