import type { Difficulty, Grid } from '../types';
import { HOLES } from '../difficulty';
import { generatePuzzle } from '../sudokuGenerator';
import { countSolutions, solvePuzzle } from '../sudokuSolver';
import { LEVEL_SEEDS } from '../puzzleSeeds';

const DIFFICULTIES: Difficulty[] = ['tutorial', 'easy', 'medium', 'hard', 'expert'];
const SEEDS = ['seedA', 'seedB', 'world1-level-01-v1', 'a-different-seed', 'final'];

function isStructurallyValidSolution(g: Grid): boolean {
  for (let i = 0; i < 9; i++) {
    const rowSet = new Set<number>();
    const colSet = new Set<number>();
    for (let j = 0; j < 9; j++) {
      const rv = g[i]![j];
      const cv = g[j]![i];
      if (rv == null || cv == null) return false;
      rowSet.add(rv);
      colSet.add(cv);
    }
    if (rowSet.size !== 9 || colSet.size !== 9) return false;
  }
  for (let bi = 0; bi < 9; bi++) {
    const br = Math.floor(bi / 3) * 3;
    const bc = (bi % 3) * 3;
    const seen = new Set<number>();
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        const v = g[r]![c];
        if (v == null) return false;
        seen.add(v);
      }
    }
    if (seen.size !== 9) return false;
  }
  return true;
}

function givensAgreeWithSolution(given: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const g = given[r]![c];
      if (g != null && g !== solution[r]![c]) return false;
    }
  }
  return true;
}

function countNulls(grid: Grid): number {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] === null) n++;
    }
  }
  return n;
}

describe('sudokuGenerator', () => {
  test.each(DIFFICULTIES)('produces a structurally-valid solution at %s difficulty', (d) => {
    for (const seed of SEEDS) {
      const puzzle = generatePuzzle(seed, d);
      expect(isStructurallyValidSolution(puzzle.solution)).toBe(true);
      expect(givensAgreeWithSolution(puzzle.given, puzzle.solution)).toBe(true);
    }
  });

  test('is deterministic — same seed produces deep-equal puzzle', () => {
    const a = generatePuzzle('determinism-test', 'easy');
    const b = generatePuzzle('determinism-test', 'easy');
    expect(a.given).toEqual(b.given);
    expect(a.solution).toEqual(b.solution);
    expect(a.holeCount).toBe(b.holeCount);
  });

  test('solvePuzzle(given) recovers the puzzle solution', () => {
    for (const d of DIFFICULTIES) {
      const puzzle = generatePuzzle(`solve-recovery-${d}`, d);
      const solved = solvePuzzle(puzzle.given);
      expect(solved).toEqual(puzzle.solution);
    }
  });

  test('every generated puzzle has exactly one solution', () => {
    for (const d of DIFFICULTIES) {
      const puzzle = generatePuzzle(`uniqueness-${d}`, d);
      expect(countSolutions(puzzle.given, 2)).toBe(1);
    }
  });

  test('hole count is at or below the difficulty target', () => {
    for (const d of DIFFICULTIES) {
      const puzzle = generatePuzzle(`hole-count-${d}`, d);
      // Our removal loop accepts fewest-givens that preserves uniqueness;
      // it never *exceeds* the target because we break out once we hit it.
      expect(puzzle.holeCount).toBeLessThanOrEqual(HOLES[d]);
      expect(countNulls(puzzle.given)).toBe(puzzle.holeCount);
    }
  });

  test('all 30 World 1 level seeds generate a valid puzzle', () => {
    // Phase 3 levels.ts will pick a difficulty per index; here we just smoke-
    // test that every level seed string yields a unique-solution puzzle at
    // each difficulty without throwing.
    for (let i = 1; i <= 30; i++) {
      const seed = LEVEL_SEEDS[i]!;
      const puzzle = generatePuzzle(seed, 'easy');
      expect(countSolutions(puzzle.given, 2)).toBe(1);
    }
  });
});
