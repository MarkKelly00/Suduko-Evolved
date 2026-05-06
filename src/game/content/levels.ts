import { DEFAULT_TARGET_TIME_S, LEVEL_SEEDS, type Difficulty, type Level } from '@/game/engine';
import { WORLD_1 } from './worlds';

/**
 * Per-level difficulty curve for World 1 (Logic Garden):
 *  - Levels 1–5:   tutorial
 *  - Levels 6–15:  easy
 *  - Levels 16–25: medium
 *  - Levels 26–30: hard
 */
function difficultyForIndex(index: number): Difficulty {
  if (index <= 5) return 'tutorial';
  if (index <= 15) return 'easy';
  if (index <= 25) return 'medium';
  return 'hard';
}

/**
 * Star thresholds. Tunable via this single function — score test runs and
 * adjust constants here once players are putting up real numbers.
 */
function starThresholds(index: number, difficulty: Difficulty): { two: number; three: number } {
  const difficultyBoost = { tutorial: 0, easy: 200, medium: 400, hard: 700 }[difficulty];
  const two = 800 + index * 40 + difficultyBoost;
  const three = 1400 + index * 70 + difficultyBoost;
  return { two, three };
}

function buildLevel(index: number): Level {
  const difficulty = difficultyForIndex(index);
  const seed = LEVEL_SEEDS[index]!;
  const targetTimeSeconds = DEFAULT_TARGET_TIME_S[difficulty];
  const { two, three } = starThresholds(index, difficulty);
  return {
    id: levelId(index),
    worldId: WORLD_1.id,
    index,
    difficulty,
    seed,
    targetTimeSeconds,
    twoStarThreshold: two,
    threeStarThreshold: three,
  };
}

export function levelId(index: number): string {
  return `world1-level-${index}`;
}

/** All World 1 levels in order. Levels 1..30. */
export const WORLD_1_LEVELS: Level[] = Array.from({ length: 30 }, (_, i) => buildLevel(i + 1));

export function getLevelById(id: string): Level | null {
  return WORLD_1_LEVELS.find((l) => l.id === id) ?? null;
}

export function nextLevelId(currentId: string): string | null {
  const current = getLevelById(currentId);
  if (!current) return null;
  if (current.index >= WORLD_1.levelCount) return null;
  return levelId(current.index + 1);
}
