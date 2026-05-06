/**
 * Deterministic puzzle generator. Picks one of the curated solved base grids,
 * applies a transform chain (each step preserves Sudoku validity), then digs
 * holes one by one — restoring any cell whose removal would make the puzzle
 * have more than one solution.
 *
 * Same seed → identical puzzle every time, on every JS engine.
 */

import type { Difficulty, Grid, Puzzle } from './types';
import { rngFromSeed, rngInt, shuffle } from './rng';
import { cloneGrid, pickBaseGrid } from './puzzleSeeds';
import { GENERATOR_MAX_ATTEMPTS, HOLES } from './difficulty';
import { RECURSION_LIMIT_ERROR, countSolutions } from './sudokuSolver';

// ----- Transformations (each preserves Sudoku validity) ---------------------

/** Permute digits 1..9 across the whole grid. */
function digitRemap(grid: Grid, rng: () => number): void {
  const perm = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r]![c];
      if (v != null) grid[r]![c] = perm[v - 1]!;
    }
  }
}

/** Rotate 90° clockwise. */
function rotate90(grid: Grid): void {
  const out: Grid = Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      out[c]![8 - r] = grid[r]![c]!;
    }
  }
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) grid[r]![c] = out[r]![c]!;
}

function rotateK(grid: Grid, k: number): void {
  const times = ((k % 4) + 4) % 4;
  for (let i = 0; i < times; i++) rotate90(grid);
}

/** Reflect horizontally (mirror columns). */
function reflectHorizontal(grid: Grid): void {
  for (let r = 0; r < 9; r++) grid[r]!.reverse();
}

/** Reflect vertically (mirror rows). */
function reflectVertical(grid: Grid): void {
  grid.reverse();
}

/** Permute the 3 horizontal bands (row-triples). */
function shuffleBands(grid: Grid, rng: () => number): void {
  const order = shuffle([0, 1, 2], rng);
  const original = grid.map((row) => row.slice());
  for (let band = 0; band < 3; band++) {
    const src = order[band]!;
    for (let i = 0; i < 3; i++) grid[band * 3 + i] = original[src * 3 + i]!;
  }
}

/** Permute the 3 rows within each band. */
function shuffleRowsWithinBands(grid: Grid, rng: () => number): void {
  for (let band = 0; band < 3; band++) {
    const order = shuffle([0, 1, 2], rng);
    const original = [grid[band * 3]!, grid[band * 3 + 1]!, grid[band * 3 + 2]!];
    for (let i = 0; i < 3; i++) grid[band * 3 + i] = original[order[i]!]!;
  }
}

/** Permute the 3 vertical stacks (column-triples). */
function shuffleStacks(grid: Grid, rng: () => number): void {
  const order = shuffle([0, 1, 2], rng);
  for (let r = 0; r < 9; r++) {
    const row = grid[r]!.slice();
    for (let stack = 0; stack < 3; stack++) {
      const src = order[stack]!;
      for (let i = 0; i < 3; i++) grid[r]![stack * 3 + i] = row[src * 3 + i]!;
    }
  }
}

/** Permute the 3 columns within each stack. */
function shuffleColsWithinStacks(grid: Grid, rng: () => number): void {
  for (let stack = 0; stack < 3; stack++) {
    const order = shuffle([0, 1, 2], rng);
    for (let r = 0; r < 9; r++) {
      const orig = [
        grid[r]![stack * 3]!,
        grid[r]![stack * 3 + 1]!,
        grid[r]![stack * 3 + 2]!,
      ];
      for (let i = 0; i < 3; i++) grid[r]![stack * 3 + i] = orig[order[i]!]!;
    }
  }
}

function applyTransforms(grid: Grid, rng: () => number): void {
  digitRemap(grid, rng);
  rotateK(grid, rngInt(rng, 4));
  if (rngInt(rng, 2) === 0) reflectHorizontal(grid);
  if (rngInt(rng, 2) === 0) reflectVertical(grid);
  shuffleBands(grid, rng);
  shuffleRowsWithinBands(grid, rng);
  shuffleStacks(grid, rng);
  shuffleColsWithinStacks(grid, rng);
}

// ----- Cell removal with uniqueness guarantee -------------------------------

function countNulls(grid: Grid): number {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] === null) n++;
    }
  }
  return n;
}

function removeCells(solution: Grid, target: number, rng: () => number): Grid {
  const order: number[] = [];
  for (let i = 0; i < 81; i++) order.push(i);
  shuffle(order, rng);

  const working = cloneGrid(solution);
  let removed = 0;
  for (const idx of order) {
    if (removed >= target) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    const saved = working[r]![c];
    if (saved == null) continue;
    working[r]![c] = null;
    if (countSolutions(working, 2) !== 1) {
      working[r]![c] = saved; // restore — would create ambiguity
    } else {
      removed++;
    }
  }
  return working;
}

// ----- Public API -----------------------------------------------------------

/**
 * Generate a puzzle with the requested difficulty for the given seed string.
 * Same seed → same puzzle, every time.
 *
 * Implementation: pick a base solution, apply seeded transforms, then dig
 * holes one by one, restoring any cell whose removal would lose uniqueness.
 *
 * If the solver's recursion safety throws on the first attempt, we re-roll
 * with a perturbed internal seed (`{seed}-r1`, `{seed}-r2`, ...). This stays
 * fully deterministic because the failure path itself is deterministic. After
 * `GENERATOR_MAX_ATTEMPTS` we accept the best-effort result.
 */
export function generatePuzzle(seed: string, difficulty: Difficulty): Puzzle {
  const targetHoles = HOLES[difficulty];
  let lastErr: unknown;
  for (let attempt = 0; attempt < GENERATOR_MAX_ATTEMPTS; attempt++) {
    const internalSeed = attempt === 0 ? seed : `${seed}-r${attempt}`;
    try {
      const rng = rngFromSeed(internalSeed);
      const solution = pickBaseGrid(internalSeed);
      applyTransforms(solution, rng);
      const given = removeCells(solution, targetHoles, rng);
      const holeCount = countNulls(given);
      return {
        seed,
        difficulty,
        given,
        solution,
        generatedAt: Date.now(),
        holeCount,
      };
    } catch (err) {
      const msg = (err as Error)?.message;
      if (msg !== RECURSION_LIMIT_ERROR) throw err;
      lastErr = err;
      // try again with a perturbed seed
    }
  }
  // Unreachable in practice for 9×9 within the budget — but stay safe:
  throw new Error(`generatePuzzle: exhausted attempts for seed "${seed}" (${String(lastErr)})`);
}
