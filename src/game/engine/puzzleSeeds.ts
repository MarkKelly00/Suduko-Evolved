/**
 * Three hand-verified solved Sudoku grids. The generator picks one based on a
 * hash of the level seed string and applies a deterministic transform chain
 * (rotate / reflect / digit remap / band+stack shuffle) to produce the level's
 * unique solution, then drills holes with uniqueness preserved.
 *
 * Each grid has been verified row-by-row, column-by-column, and box-by-box.
 */

import type { Grid } from './types';
import { hashSeed } from './rng';

/** Wikipedia canonical example. */
export const SEED_GRID_A: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

/** Canonical "shift 3 then 1" cyclic Latin square. */
export const SEED_GRID_B: Grid = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

/** A second hand-verified asymmetric solution to add visual variety. */
export const SEED_GRID_C: Grid = [
  [9, 8, 7, 6, 5, 4, 3, 2, 1],
  [2, 4, 6, 1, 7, 3, 9, 8, 5],
  [3, 5, 1, 9, 2, 8, 7, 4, 6],
  [1, 2, 8, 5, 3, 7, 6, 9, 4],
  [6, 3, 4, 8, 9, 2, 1, 5, 7],
  [7, 9, 5, 4, 6, 1, 8, 3, 2],
  [5, 1, 9, 2, 8, 6, 4, 7, 3],
  [4, 7, 2, 3, 1, 9, 5, 6, 8],
  [8, 6, 3, 7, 4, 5, 2, 1, 9],
];

const SEED_GRIDS: readonly Grid[] = [SEED_GRID_A, SEED_GRID_B, SEED_GRID_C];

/** Selects one of the three base grids deterministically from a seed string. */
export function pickBaseGrid(seed: string): Grid {
  const idx = hashSeed(seed) % SEED_GRIDS.length;
  // Deep clone so transforms don't mutate the constants.
  return cloneGrid(SEED_GRIDS[idx]!);
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

/**
 * Stable seed strings for World 1 levels 1-30. Versioned so a single bad
 * puzzle can be replaced (`-v2`) without disturbing other levels' progress.
 */
export const LEVEL_SEEDS: Record<number, string> = Object.freeze({
  1: 'world1-level-01-v1',
  2: 'world1-level-02-v1',
  3: 'world1-level-03-v1',
  4: 'world1-level-04-v1',
  5: 'world1-level-05-v1',
  6: 'world1-level-06-v1',
  7: 'world1-level-07-v1',
  8: 'world1-level-08-v1',
  9: 'world1-level-09-v1',
  10: 'world1-level-10-v1',
  11: 'world1-level-11-v1',
  12: 'world1-level-12-v1',
  13: 'world1-level-13-v1',
  14: 'world1-level-14-v1',
  15: 'world1-level-15-v1',
  16: 'world1-level-16-v1',
  17: 'world1-level-17-v1',
  18: 'world1-level-18-v1',
  19: 'world1-level-19-v1',
  20: 'world1-level-20-v1',
  21: 'world1-level-21-v1',
  22: 'world1-level-22-v1',
  23: 'world1-level-23-v1',
  24: 'world1-level-24-v1',
  25: 'world1-level-25-v1',
  26: 'world1-level-26-v1',
  27: 'world1-level-27-v1',
  28: 'world1-level-28-v1',
  29: 'world1-level-29-v1',
  30: 'world1-level-30-v1',
});
