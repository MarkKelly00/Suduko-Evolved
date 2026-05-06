import { useEffect } from 'react';
import { selectLastEvents, useGameStore } from '@/game/state/useGameStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { duration } from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';
import { audioService } from '@/services/audio/audioService';

/**
 * Audio + haptics dispatcher for engine completion events. The visible
 * VFX (sweeps, beams, bursts, Logic Bloom, combo label) live in the
 * separate `EffectsLayer` component — this overlay deliberately renders
 * nothing, keeping responsibility split: VFX = visual, this = sensory.
 *
 * It also clears `lastEvents` on the store after a short delay so the
 * effects layer doesn't keep replaying the same batch on later renders.
 */
export function CompletionOverlay() {
  const events = useGameStore(selectLastEvents);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const clearLastEvents = useGameStore((s) => s.clearLastEvents);

  useEffect(() => {
    if (events.length === 0) return;
    for (const ev of events) {
      switch (ev.type) {
        case 'row':
          audioService.playRowComplete();
          hapticsService.medium();
          break;
        case 'col':
          audioService.playColumnComplete();
          hapticsService.medium();
          break;
        case 'box':
          audioService.playBoxComplete();
          hapticsService.heavy();
          break;
        case 'numberSet':
          audioService.playNumberSetComplete();
          hapticsService.medium();
          break;
        case 'puzzle':
          audioService.playPuzzleComplete();
          hapticsService.puzzleComplete();
          break;
      }
    }
    if (events.filter((e) => e.type !== 'puzzle').length >= 2) {
      audioService.playCombo();
      hapticsService.combo();
    }
    // Reduced motion still gets the same audio/haptic dispatch above; we
    // just hand control back to the store quickly so the effects layer
    // (which respects reduced motion internally) doesn't linger.
    const lifeMs = reducedMotion ? duration.fast : duration.cinematic + duration.fast;
    const t = setTimeout(() => clearLastEvents(), lifeMs);
    return () => clearTimeout(t);
  }, [events, reducedMotion, clearLastEvents]);

  return null;
}
