/**
 * Bitmask backtracking solver with MRV (most-constrained-variable) heuristic.
 * Pure TypeScript, no external solvers, no native deps. The same primitives
 * power both `solvePuzzle` and `countSolutions`.
 *
 * Throws `Error('RECURSION_LIMIT')` when total recursive calls exceed
 * `MAX_SOLVER_RECURSION` so the generator can detect and re-roll.
 */

import type { Grid } from './types';
import { MAX_SOLVER_RECURSION } from './difficulty';
import { cloneGrid } from './puzzleSeeds';

const ALL_DIGITS_MASK = 0x1ff; // bits 0..8 set, representing digits 1..9

export const RECURSION_LIMIT_ERROR = 'RECURSION_LIMIT';

export function boxIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

interface Masks {
  rows: Int32Array; // length 9
  cols: Int32Array;
  boxes: Int32Array;
}

/**
 * Build row/col/box bitmasks from a grid. Returns `null` if the input
 * already contains a contradiction (the same digit twice in any unit).
 */
function buildMasks(grid: Grid): Masks | null {
  const rows = new Int32Array(9);
  const cols = new Int32Array(9);
  const boxes = new Int32Array(9);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r]![c];
      if (v != null) {
        const bit = 1 << (v - 1);
        const b = boxIndex(r, c);
        if (rows[r]! & bit) return null;
        if (cols[c]! & bit) return null;
        if (boxes[b]! & bit) return null;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
      }
    }
  }
  return { rows, cols, boxes };
}

function popcount9(x: number): number {
  let n = 0;
  while (x) {
    x &= x - 1;
    n++;
  }
  return n;
}

interface Ctx {
  calls: number;
  limit: number;
}

interface MRVCell {
  r: number;
  c: number;
  freeMask: number;
  count: number;
}

function findMRVCell(grid: Grid, masks: Masks): MRVCell {
  let best: MRVCell = { r: -1, c: -1, freeMask: 0, count: 10 };
  for (let r = 0; r < 9; r++) {
    const row = grid[r]!;
    for (let c = 0; c < 9; c++) {
      if (row[c] !== null) continue;
      const used = masks.rows[r]! | masks.cols[c]! | masks.boxes[boxIndex(r, c)]!;
      const free = ALL_DIGITS_MASK & ~used;
      const count = popcount9(free);
      if (count < best.count) {
        best = { r, c, freeMask: free, count };
        if (count === 0) return best; // dead-end, fail fast
      }
    }
  }
  return best;
}

function solveBacktrack(grid: Grid, masks: Masks, ctx: Ctx): boolean {
  if (++ctx.calls > ctx.limit) throw new Error(RECURSION_LIMIT_ERROR);
  const cell = findMRVCell(grid, masks);
  if (cell.r === -1) return true; // grid filled
  if (cell.count === 0) return false;
  const { r, c, freeMask } = cell;
  const b = boxIndex(r, c);
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << (d - 1);
    if (!(freeMask & bit)) continue;
    grid[r]![c] = d;
    masks.rows[r]! |= bit;
    masks.cols[c]! |= bit;
    masks.boxes[b]! |= bit;
    if (solveBacktrack(grid, masks, ctx)) return true;
    grid[r]![c] = null;
    masks.rows[r]! &= ~bit;
    masks.cols[c]! &= ~bit;
    masks.boxes[b]! &= ~bit;
  }
  return false;
}

/**
 * Returns the unique solved grid for a Sudoku, or `null` if the input has no
 * solution. If the input has multiple solutions, returns the first one found
 * (use `countSolutions` if you need to know about ambiguity).
 *
 * Does not mutate the input grid.
 */
export function solvePuzzle(input: Grid): Grid | null {
  const grid = cloneGrid(input);
  const masks = buildMasks(grid);
  if (masks === null) return null;
  const ctx: Ctx = { calls: 0, limit: MAX_SOLVER_RECURSION };
  return solveBacktrack(grid, masks, ctx) ? grid : null;
}

function countBacktrack(grid: Grid, masks: Masks, ctx: Ctx, limit: number): number {
  if (++ctx.calls > ctx.limit) throw new Error(RECURSION_LIMIT_ERROR);
  const cell = findMRVCell(grid, masks);
  if (cell.r === -1) return 1; // one full solution found
  if (cell.count === 0) return 0;
  const { r, c, freeMask } = cell;
  const b = boxIndex(r, c);
  let count = 0;
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << (d - 1);
    if (!(freeMask & bit)) continue;
    grid[r]![c] = d;
    masks.rows[r]! |= bit;
    masks.cols[c]! |= bit;
    masks.boxes[b]! |= bit;
    count += countBacktrack(grid, masks, ctx, limit - count);
    grid[r]![c] = null;
    masks.rows[r]! &= ~bit;
    masks.cols[c]! &= ~bit;
    masks.boxes[b]! &= ~bit;
    if (count >= limit) return count; // early exit: caller only cares about the threshold
  }
  return count;
}

/**
 * Counts solutions of `input`, stopping as soon as `limit` is reached. Used
 * to verify a generated puzzle is uniquely solvable (`limit=2`, expect `1`).
 *
 * Does not mutate the input grid. Throws `Error('RECURSION_LIMIT')` if the
 * search blows past the safety threshold (caller should re-roll).
 */
export function countSolutions(input: Grid, limit = 2): number {
  const grid = cloneGrid(input);
  const masks = buildMasks(grid);
  if (masks === null) return 0;
  const ctx: Ctx = { calls: 0, limit: MAX_SOLVER_RECURSION };
  return countBacktrack(grid, masks, ctx, limit);
}

/**
 * Returns the digits 1-9 that could legally be placed at (r,c) in `grid`
 * (purely by row/col/box constraints, no deeper search). Empty array when the
 * cell is already filled or when no digit fits.
 */
export function getCandidatesAt(grid: Grid, r: number, c: number): number[] {
  if (grid[r]?.[c] != null) return [];
  const used = new Set<number>();
  for (let i = 0; i < 9; i++) {
    const a = grid[r]![i];
    const b = grid[i]![c];
    if (a != null) used.add(a);
    if (b != null) used.add(b);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      const v = grid[rr]![cc];
      if (v != null) used.add(v);
    }
  }
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d);
  return out;
}
