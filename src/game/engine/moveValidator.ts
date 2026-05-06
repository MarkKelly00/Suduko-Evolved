import type { Grid, MoveValidationResult } from './types';
import { boxIndex, getCandidatesAt } from './sudokuSolver';

/**
 * Pure conflict + correctness check. Does NOT mutate `grid`.
 *
 * `valid`     — placing `value` at (row,col) doesn't conflict with any peer.
 * `conflicts` — every other cell in the same row/col/box that already holds
 *               `value`. Empty when `value` is null (erase).
 * `correct`   — `value` equals `solution[row][col]`. For erase, `correct` is
 *               true only if the solution cell is also null (which never
 *               happens for fully-solvable puzzles, so erase always reports
 *               `correct: false` here).
 */
export function validateMove(
  grid: Grid,
  solution: Grid,
  row: number,
  col: number,
  value: number | null,
): MoveValidationResult {
  if (value == null) {
    return {
      valid: true,
      conflicts: [],
      correct: solution[row]![col] == null,
    };
  }
  const conflicts: { row: number; col: number }[] = [];
  // Row scan
  for (let cc = 0; cc < 9; cc++) {
    if (cc === col) continue;
    if (grid[row]![cc] === value) conflicts.push({ row, col: cc });
  }
  // Column scan
  for (let rr = 0; rr < 9; rr++) {
    if (rr === row) continue;
    if (grid[rr]![col] === value) conflicts.push({ row: rr, col });
  }
  // Box scan (de-duplicate against row/col hits we already added)
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (rr === row && cc === col) continue;
      if (grid[rr]![cc] === value) {
        const dup = conflicts.some((p) => p.row === rr && p.col === cc);
        if (!dup) conflicts.push({ row: rr, col: cc });
      }
    }
  }
  const correct = solution[row]![col] === value;
  return { valid: conflicts.length === 0, conflicts, correct };
}

/** Re-export the solver's candidate helper at the validator boundary. */
export function getCandidates(grid: Grid, row: number, col: number): number[] {
  return getCandidatesAt(grid, row, col);
}

export { boxIndex };
