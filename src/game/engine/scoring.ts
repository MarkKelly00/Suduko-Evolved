import type { CompletionTallies, Level, ScoreBreakdown, StarResult } from './types';

/** Engine-internal scoring constants. Tune values here, not at call sites. */
export const SCORING = {
  BASE_PER_CORRECT: 10,
  ROW_BONUS: 50,
  COL_BONUS: 50,
  BOX_BONUS: 75,
  NUMSET_BONUS: 100,
  COMBO_BONUS_PER_EXTRA: 50,
  NO_MISTAKE_BONUS: 200,
  NO_HINT_BONUS: 150,
  POINTS_PER_SEC_SAVED: 2,
  STREAK_STEP: 5,
  STREAK_INCREMENT: 0.1,
  STREAK_MAX_MULT: 2.0,
} as const;

export interface ScoreInput {
  /** Cells the player correctly placed (excluding givens). For a completed
   *  puzzle this is `81 − givenCount`. */
  correctPlacements: number;
  tallies: CompletionTallies;
  mistakes: number;
  hintsUsed: number;
  /** Time spent on the puzzle in seconds. */
  elapsedSeconds: number;
  targetTimeSeconds: number;
  /** Player's final/highest streak during the session. */
  streak: number;
}

export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const {
    correctPlacements,
    tallies,
    mistakes,
    hintsUsed,
    elapsedSeconds,
    targetTimeSeconds,
    streak,
  } = input;

  const base = correctPlacements * SCORING.BASE_PER_CORRECT;
  const rowBonus = tallies.rowsCompleted * SCORING.ROW_BONUS;
  const colBonus = tallies.colsCompleted * SCORING.COL_BONUS;
  const boxBonus = tallies.boxesCompleted * SCORING.BOX_BONUS;
  const numberSetBonus = tallies.numberSetsCompleted * SCORING.NUMSET_BONUS;
  const comboBonus = tallies.comboCount * SCORING.COMBO_BONUS_PER_EXTRA;
  const noMistakeBonus = mistakes === 0 ? SCORING.NO_MISTAKE_BONUS : 0;
  const noHintBonus = hintsUsed === 0 ? SCORING.NO_HINT_BONUS : 0;
  const timeBonus = Math.max(
    0,
    (targetTimeSeconds - elapsedSeconds) * SCORING.POINTS_PER_SEC_SAVED,
  );
  const streakSteps = Math.floor(Math.max(0, streak) / SCORING.STREAK_STEP);
  const streakMultiplier = Math.min(
    SCORING.STREAK_MAX_MULT,
    1.0 + SCORING.STREAK_INCREMENT * streakSteps,
  );

  const subtotal =
    base +
    rowBonus +
    colBonus +
    boxBonus +
    numberSetBonus +
    comboBonus +
    noMistakeBonus +
    noHintBonus +
    timeBonus;
  const total = Math.round(subtotal * streakMultiplier);

  return {
    base,
    rowBonus,
    colBonus,
    boxBonus,
    numberSetBonus,
    comboBonus,
    noMistakeBonus,
    noHintBonus,
    timeBonus,
    streakMultiplier,
    total,
  };
}

export interface StarsInput {
  scoreTotal: number;
  level: Pick<Level, 'twoStarThreshold' | 'threeStarThreshold' | 'targetTimeSeconds'>;
  mistakes: number;
  hintsUsed: number;
  elapsedSeconds: number;
}

export function calculateStars(input: StarsInput): StarResult {
  const { scoreTotal, level, mistakes, hintsUsed, elapsedSeconds } = input;
  let stars: 1 | 2 | 3 = 1;
  if (scoreTotal >= level.threeStarThreshold) stars = 3;
  else if (scoreTotal >= level.twoStarThreshold) stars = 2;

  const crown =
    stars === 3 &&
    mistakes === 0 &&
    hintsUsed === 0 &&
    elapsedSeconds <= level.targetTimeSeconds;

  return { stars, crown };
}

export function calculateXP(input: {
  scoreTotal: number;
  stars: 1 | 2 | 3;
  crown: boolean;
}): number {
  const { scoreTotal, stars, crown } = input;
  return Math.floor(Math.max(0, scoreTotal) / 10) + stars * 25 + (crown ? 50 : 0);
}
