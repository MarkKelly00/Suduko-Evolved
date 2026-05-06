import type { Difficulty } from './types';

/**
 * Number of cells removed from the solved grid for each difficulty.
 *  - tutorial:  30 holes (51 givens) — gentle onboarding.
 *  - easy:      40 holes (41 givens) — typical newspaper "easy".
 *  - medium:    50 holes (31 givens) — typical newspaper "medium".
 *  - hard:      56 holes (25 givens) — capped well below the 60-hole limit
 *               where uniqueness with pure transform-and-dig becomes brittle.
 */
export const HOLES: Record<Difficulty, number> = {
  tutorial: 30,
  easy: 40,
  medium: 50,
  hard: 56,
};

export const DEFAULT_TARGET_TIME_S: Record<Difficulty, number> = {
  tutorial: 480,
  easy: 360,
  medium: 600,
  hard: 900,
};

/**
 * Hard cap on solver recursion when checking uniqueness during cell removal.
 * If exceeded the generator throws `RECURSION_LIMIT` and re-rolls with a
 * perturbed seed. Empirically 9×9 with MRV bottoms out well under 50k —
 * 200k leaves a comfortable safety margin.
 */
export const MAX_SOLVER_RECURSION = 200_000;

/** Maximum re-roll attempts before giving up and accepting fewest-givens. */
export const GENERATOR_MAX_ATTEMPTS = 4;
