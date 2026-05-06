import type { Grid } from '../types';
import { cloneGrid, SEED_GRID_A } from '../puzzleSeeds';
import { validateMove, getCandidates } from '../moveValidator';

const solution: Grid = SEED_GRID_A;

describe('validateMove', () => {
  test('flags row conflicts', () => {
    const grid = cloneGrid(solution);
    grid[0]![3] = null; // make a hole at (0,3)
    // grid[0] still has the other 8 digits including 6 at (0,3) originally;
    // now the row 0 contains 5,3,4,_,7,8,9,1,2 (digit 6 missing).
    // Try placing 5 at (0,3) — should conflict with (0,0).
    const result = validateMove(grid, solution, 0, 3, 5);
    expect(result.valid).toBe(false);
    expect(result.correct).toBe(false);
    expect(result.conflicts.some((p) => p.row === 0 && p.col === 0)).toBe(true);
  });

  test('flags column conflicts', () => {
    const grid = cloneGrid(solution);
    grid[3]![0] = null;
    // Column 0 contains 5,6,1,_,4,7,9,2,3. Try placing 5 — conflicts with (0,0).
    const result = validateMove(grid, solution, 3, 0, 5);
    expect(result.valid).toBe(false);
    expect(result.conflicts.some((p) => p.row === 0 && p.col === 0)).toBe(true);
  });

  test('flags box conflicts', () => {
    const grid = cloneGrid(solution);
    grid[1]![1] = null; // hole inside box 0
    // Box 0 contains 5,3,4,6,_,2,1,9,8 (digit 7 missing).
    // Place 5 at (1,1) — conflicts with (0,0).
    const result = validateMove(grid, solution, 1, 1, 5);
    expect(result.valid).toBe(false);
    expect(result.conflicts.some((p) => p.row === 0 && p.col === 0)).toBe(true);
  });

  test('marks correct=true when value matches solution', () => {
    const grid = cloneGrid(solution);
    grid[4]![4] = null;
    const result = validateMove(grid, solution, 4, 4, solution[4]![4]!);
    expect(result.correct).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  test('null value (erase) is always valid', () => {
    const grid = cloneGrid(solution);
    const result = validateMove(grid, solution, 5, 5, null);
    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  test('does not mutate the input grid', () => {
    const grid = cloneGrid(solution);
    const before = cloneGrid(grid);
    validateMove(grid, solution, 0, 0, 9);
    expect(grid).toEqual(before);
  });

  test('does not return duplicate conflicts when row+box overlap', () => {
    const grid = cloneGrid(solution);
    grid[0]![1] = null;
    // Place 4 at (0,1): (0,2) holds 4 — that's both row-and-box overlap.
    const result = validateMove(grid, solution, 0, 1, 4);
    const dedup = new Set(result.conflicts.map((p) => `${p.row},${p.col}`));
    expect(dedup.size).toBe(result.conflicts.length);
  });
});

describe('getCandidates', () => {
  test('returns digits that don’t conflict in row/col/box', () => {
    const grid = cloneGrid(solution);
    grid[0]![0] = null;
    // Placing back the original 5 should always be valid; getCandidates
    // should include 5.
    expect(getCandidates(grid, 0, 0)).toContain(5);
  });
});
