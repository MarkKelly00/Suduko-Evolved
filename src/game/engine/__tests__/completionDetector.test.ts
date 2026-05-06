import type { Grid } from '../types';
import { cloneGrid, SEED_GRID_A } from '../puzzleSeeds';
import { detectCompletionEvents } from '../completionDetector';

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
}

describe('detectCompletionEvents', () => {
  test('returns no events when no cells changed', () => {
    const events = detectCompletionEvents(SEED_GRID_A, SEED_GRID_A);
    expect(events).toEqual([]);
  });

  test('emits a row event when a row is completed by a single placement', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after);
    expect(events.find((e) => e.type === 'row' && e.index === 0)).toBeTruthy();
    // Row 0 had 8/9 cells before; placing the last completes the row.
    // It also completes Box 0 because (0,0) is in box 0 and the box was
    // missing the same cell.
    expect(events.find((e) => e.type === 'box' && e.index === 0)).toBeTruthy();
    // Column 0 also gets completed.
    expect(events.find((e) => e.type === 'col' && e.index === 0)).toBeTruthy();
  });

  test('emits a numberSet event when the last instance of a digit is placed', () => {
    // Construct: a grid where digit 5 appears 8 times, and one specific cell
    // expects 5 in the solution. After placing, count(5) becomes 9.
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null; // SEED_GRID_A[0][0] = 5
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after);
    expect(events.find((e) => e.type === 'numberSet' && e.value === 5)).toBeTruthy();
  });

  test('emits puzzle event when the final cell is placed', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[8]![8] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after);
    expect(events.find((e) => e.type === 'puzzle')).toBeTruthy();
  });

  test('emits multiple events when one move completes row + col + box at once', () => {
    // The (0,0) corner placement completes row 0, col 0, box 0, and
    // potentially numberSet for value 5.
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after);
    const types = new Set(events.map((e) => e.type));
    expect(types.has('row')).toBe(true);
    expect(types.has('col')).toBe(true);
    expect(types.has('box')).toBe(true);
  });

  test('emits no events when a placement does not complete any region', () => {
    const before = emptyGrid();
    const after = emptyGrid();
    after[4]![4] = 5;
    const events = detectCompletionEvents(before, after);
    expect(events).toEqual([]);
  });

  test('does not mutate either grid', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const beforeCopy = cloneGrid(before);
    const afterCopy = cloneGrid(after);
    detectCompletionEvents(before, after);
    expect(before).toEqual(beforeCopy);
    expect(after).toEqual(afterCopy);
  });
});
