/**
 * Duel mode helpers. A duel is a same-seed race — the server hands the
 * client a `puzzle_seed` (deterministic from the room id) and a `mode`
 * id; we synthesize a `Level` from that plus the existing time-trial
 * mode catalog so the engine + scoring pipeline don't need to learn
 * about duels.
 *
 * Public surface:
 *   - synthesizeDuelLevel(modeId, seed) → Level
 *   - getDuelMode(modeId) → TimeTrialMode | null
 *   - DEFAULT_DUEL_MODE_ID — the mode random matchmaking uses
 */
import { type Level } from '@/game/engine';
import {
  getTimeTrialMode,
  synthesizeSprintLevel,
  type TimeTrialMode,
} from './timeTrial';

/** The mode used when the user taps "Online Duel" (random matchmaking). */
export const DEFAULT_DUEL_MODE_ID = 'sprint-3min' as const;

export function getDuelMode(modeId: string): TimeTrialMode | null {
  return getTimeTrialMode(modeId);
}

export function synthesizeDuelLevel(modeId: string, seed: string): Level | null {
  const mode = getTimeTrialMode(modeId);
  if (!mode) return null;
  return synthesizeSprintLevel(mode, seed);
}
