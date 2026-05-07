/**
 * Conversions between local progress shapes and the
 * scoreSubmissionService inputs.
 */

import type {
  ProgressLevelEntry,
  TimeTrialBest,
} from '@/services/persistence/schema';
import type {
  LevelScoreSubmission,
  TimeTrialScoreSubmission,
} from '@/services/supabase/scoreSubmissionService';
import { getLevelById } from '@/game/content/levels';

export function serializeLevelEntry(
  levelId: string,
  entry: ProgressLevelEntry,
): LevelScoreSubmission | null {
  const level = getLevelById(levelId);
  if (!level) return null;
  return {
    levelId,
    puzzleSeed: level.seed,
    score: entry.bestScore,
    timeSeconds: entry.bestTime,
    mistakes: 0, // Local doesn't capture per-attempt mistakes for the best run
    hints: 0,
    stars: entry.stars,
    crown: entry.crown,
    moveCount: null,
  };
}

export function serializeTimeTrialBest(
  modeId: string,
  best: TimeTrialBest,
  puzzleSeed: string,
): TimeTrialScoreSubmission {
  return {
    modeId,
    puzzleSeed,
    score: best.score,
    timeSeconds: best.time,
    mistakes: 0,
    hints: 0,
    moveCount: null,
    periodKey: '',
  };
}
