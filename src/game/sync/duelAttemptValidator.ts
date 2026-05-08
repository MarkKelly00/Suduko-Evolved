/**
 * Lightweight client-side anti-cheat sanity checks. The server-side RPC
 * is the authoritative gate (RLS + SECURITY DEFINER); these checks just
 * flag a `suspicious` bit on outgoing attempts and short-circuit obvious
 * client-side bugs before we eat a server round-trip.
 *
 * Goals:
 *   - Reject obviously impossible scores/times.
 *   - Reject final grids that don't match the puzzle seed.
 *   - Avoid flagging honest players for clock drift / network jitter.
 */

import { generatePuzzle, type Difficulty } from '@/game/engine';

/** Pure local sudoku validation — no engine import dependency. */
function isSolution(grid: number[]): boolean {
  if (grid.length !== 81) return false;
  for (let i = 0; i < 81; i += 1) {
    const v = grid[i];
    if (!Number.isInteger(v) || v < 1 || v > 9) return false;
  }
  // Rows, columns, boxes — each must contain {1..9} exactly once.
  for (let group = 0; group < 9; group += 1) {
    const row = new Set<number>();
    const col = new Set<number>();
    const box = new Set<number>();
    for (let i = 0; i < 9; i += 1) {
      row.add(grid[group * 9 + i]);
      col.add(grid[i * 9 + group]);
      const br = Math.floor(group / 3) * 3 + Math.floor(i / 3);
      const bc = (group % 3) * 3 + (i % 3);
      box.add(grid[br * 9 + bc]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return false;
  }
  return true;
}

export interface ValidationContext {
  puzzleSeed: string;
  difficulty: Difficulty;
  durationSeconds: number; // mode duration cap
}

export interface AttemptDraft {
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
  moveCount?: number | null;
  finalGrid?: number[] | null;
}

export interface ValidationVerdict {
  ok: boolean;
  suspicious: boolean;
  reasons: string[];
}

const MAX_SCORE = 50_000; // generous ceiling — current scoring tops ~25k
const MIN_SCORE = 0;
const MAX_MOVES = 600; // 81 cells * conservative re-edit budget

export function validateDuelAttempt(
  ctx: ValidationContext,
  attempt: AttemptDraft,
): ValidationVerdict {
  const reasons: string[] = [];
  let suspicious = false;

  if (attempt.score < MIN_SCORE) reasons.push('score_below_zero');
  if (attempt.score > MAX_SCORE) {
    reasons.push('score_exceeds_ceiling');
    suspicious = true;
  }
  if (attempt.timeSeconds < 0) reasons.push('negative_time');
  if (attempt.timeSeconds > ctx.durationSeconds + 5) {
    // Allow a small grace for round-trip / clock drift.
    reasons.push('time_exceeds_duration');
    suspicious = true;
  }
  if (attempt.mistakes < 0) reasons.push('negative_mistakes');
  if (attempt.hints < 0) reasons.push('negative_hints');
  if (attempt.moveCount != null && attempt.moveCount < 0) {
    reasons.push('negative_moves');
  }
  if (attempt.moveCount != null && attempt.moveCount > MAX_MOVES) {
    reasons.push('move_count_exceeds_cap');
    suspicious = true;
  }

  if (attempt.finalGrid && attempt.finalGrid.length === 81) {
    // Verify the final grid is a valid solution. Fast: regenerate the same
    // puzzle from the seed and compare flattened against `solution`.
    try {
      const generated = generatePuzzle(ctx.puzzleSeed, ctx.difficulty);
      const expected = generated.solution.flat();
      if (!isSolution(attempt.finalGrid)) {
        reasons.push('final_grid_not_a_solution');
        suspicious = true;
      } else if (
        expected.length === 81 &&
        expected.some((v, i) => attempt.finalGrid![i] !== v)
      ) {
        reasons.push('final_grid_diverges_from_seed_solution');
        suspicious = true;
      }
    } catch {
      // If we can't regenerate (engine error), don't flag the player.
    }
  }

  return {
    ok: reasons.filter((r) => r === 'final_grid_not_a_solution' || r === 'final_grid_diverges_from_seed_solution').length === 0,
    suspicious,
    reasons,
  };
}
