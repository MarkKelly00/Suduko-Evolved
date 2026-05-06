/**
 * Time Trial orchestrator. The MVP "3-Minute Sprint" pits the player
 * against the clock on a single medium puzzle: solve before the timer hits
 * zero for a clean run + time bonus, otherwise the run ends at 0:00 with
 * the partial score earned so far. The Daily Sprint is the same but pinned
 * to a date-derived seed so every player races the same puzzle.
 *
 * The mode reuses the campaign engine and `useGameStore` infrastructure —
 * we just synthesize an ad-hoc {@link Level} from the mode + seed and start
 * a sprint session via `useGameStore.startSprintSession`.
 */
import {
  DEFAULT_TARGET_TIME_S,
  hashSeed,
  type Difficulty,
  type Level,
} from '@/game/engine';

export interface TimeTrialMode {
  id: string;
  name: string;
  durationSeconds: number;
  /** True for daily seeded modes (same seed for all players). */
  daily: boolean;
  /** Difficulty bucket the synthesized level uses for puzzle generation. */
  difficulty: Difficulty;
  /** Stable virtual world id so the level looks coherent in logs/results. */
  worldId: string;
}

export const TIME_TRIAL_MODES: TimeTrialMode[] = [
  {
    id: 'sprint-3min',
    name: '3-Minute Sprint',
    durationSeconds: 180,
    daily: false,
    difficulty: 'medium',
    worldId: 'time-trial',
  },
  {
    id: 'daily-sprint',
    name: 'Daily Sprint',
    durationSeconds: 180,
    daily: true,
    difficulty: 'medium',
    worldId: 'time-trial',
  },
];

export function getTimeTrialMode(modeId: string): TimeTrialMode | null {
  return TIME_TRIAL_MODES.find((m) => m.id === modeId) ?? null;
}

export function dailySeed(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}

/** Different `runNumber` values produce different deterministic seeds, so
 *  consecutive 3-Minute Sprints don't keep handing the player the same
 *  puzzle. The seed itself stays seedable / replayable for leaderboard
 *  validation (the run record must capture which `runNumber` was used). */
export function deterministicSprintSeed(modeId: string, runNumber: number): string {
  return `tt-${modeId}-${hashSeed(`${runNumber}`)}`;
}

/** Build a synthetic {@link Level} that the engine + scoring pipeline
 *  understand, without polluting the campaign content. The thresholds are
 *  rough sprint targets — what matters at runtime is the timer + completion
 *  bonus, not 2/3-star gating. */
export function synthesizeSprintLevel(mode: TimeTrialMode, seed: string): Level {
  return {
    id: `${mode.id}::${seed}`,
    worldId: mode.worldId,
    index: 0,
    difficulty: mode.difficulty,
    seed,
    targetTimeSeconds: Math.min(mode.durationSeconds, DEFAULT_TARGET_TIME_S[mode.difficulty]),
    twoStarThreshold: 1500,
    threeStarThreshold: 3000,
  };
}
