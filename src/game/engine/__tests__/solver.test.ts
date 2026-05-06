import type { Grid } from '../types';
import { SEED_GRID_A, SEED_GRID_B, SEED_GRID_C, cloneGrid } from '../puzzleSeeds';
import { boxIndex, countSolutions, getCandidatesAt, solvePuzzle } from '../sudokuSolver';

function isFullValidSolution(g: Grid): boolean {
  for (let i = 0; i < 9; i++) {
    const rowSet = new Set<number>();
    const colSet = new Set<number>();
    const boxSet = new Set<number>();
    for (let j = 0; j < 9; j++) {
      const rv = g[i]![j];
      const cv = g[j]![i];
      if (rv == null || cv == null) return false;
      rowSet.add(rv);
      colSet.add(cv);
    }
    if (rowSet.size !== 9 || colSet.size !== 9) return false;
    const br = Math.floor(i / 3) * 3;
    const bc = (i % 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        const v = g[r]![c];
        if (v == null) return false;
        boxSet.add(v);
      }
    }
    if (boxSet.size !== 9) return false;
  }
  return true;
}

describe('sudokuSolver', () => {
  test('seed grids are themselves valid solutions', () => {
    expect(isFullValidSolution(SEED_GRID_A)).toBe(true);
    expect(isFullValidSolution(SEED_GRID_B)).toBe(true);
    expect(isFullValidSolution(SEED_GRID_C)).toBe(true);
  });

  test('boxIndex matches expected mapping', () => {
    expect(boxIndex(0, 0)).toBe(0);
    expect(boxIndex(0, 8)).toBe(2);
    expect(boxIndex(4, 4)).toBe(4);
    expect(boxIndex(8, 8)).toBe(8);
    expect(boxIndex(7, 1)).toBe(6);
  });

  test('solvePuzzle returns the same grid for an already-solved input', () => {
    const result = solvePuzzle(SEED_GRID_A);
    expect(result).not.toBeNull();
    expect(result).toEqual(SEED_GRID_A);
  });

  test('solvePuzzle does not mutate the input', () => {
    const before = cloneGrid(SEED_GRID_A);
    solvePuzzle(SEED_GRID_A);
    expect(SEED_GRID_A).toEqual(before);
  });

  test('solvePuzzle solves a puzzle with a few cells removed', () => {
    const grid = cloneGrid(SEED_GRID_A);
    grid[0]![0] = null;
    grid[4]![4] = null;
    grid[8]![8] = null;
    const solved = solvePuzzle(grid);
    expect(solved).toEqual(SEED_GRID_A);
  });

  test('countSolutions returns 1 for the seed grids', () => {
    expect(countSolutions(SEED_GRID_A, 2)).toBe(1);
    expect(countSolutions(SEED_GRID_B, 2)).toBe(1);
    expect(countSolutions(SEED_GRID_C, 2)).toBe(1);
  });

  test('countSolutions returns >=2 for an empty grid (early-exit at limit)', () => {
    const empty: Grid = Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
    const n = countSolutions(empty, 2);
    expect(n).toBeGreaterThanOrEqual(2);
  });

  test('countSolutions returns 0 for a broken grid', () => {
    // Two of the same digit in row 0
    const broken = cloneGrid(SEED_GRID_A);
    broken[0]![1] = broken[0]![0];
    expect(countSolutions(broken, 2)).toBe(0);
  });

  test('getCandidatesAt returns all unused digits for an empty cell', () => {
    const grid: Grid = Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
    grid[0]![0] = 1;
    grid[1]![1] = 2;
    const cands = getCandidatesAt(grid, 0, 1);
    // (0,1) is in row 0 (uses 1) and box 0 (uses 1, 2). Col 1 has 2.
    // So forbidden = {1,2}. Allowed = 3..9.
    expect(cands).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  test('getCandidatesAt returns empty array for a filled cell', () => {
    expect(getCandidatesAt(SEED_GRID_A, 0, 0)).toEqual([]);
  });
});
