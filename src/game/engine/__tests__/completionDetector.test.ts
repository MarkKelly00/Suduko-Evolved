import type { Grid } from '../types';
import { cloneGrid, SEED_GRID_A } from '../puzzleSeeds';
import { detectCompletionEvents } from '../completionDetector';

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
}

describe('detectCompletionEvents', () => {
  test('returns no events when no cells changed', () => {
    const events = detectCompletionEvents(SEED_GRID_A, SEED_GRID_A, SEED_GRID_A);
    expect(events).toEqual([]);
  });

  test('emits a row event when a row is completed correctly by a single placement', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events.find((e) => e.type === 'row' && e.index === 0)).toBeTruthy();
    expect(events.find((e) => e.type === 'box' && e.index === 0)).toBeTruthy();
    expect(events.find((e) => e.type === 'col' && e.index === 0)).toBeTruthy();
  });

  test('emits a numberSet event when the last instance of a digit is placed correctly', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events.find((e) => e.type === 'numberSet' && e.value === SEED_GRID_A[0]![0])).toBeTruthy();
  });

  test('emits puzzle event when the final cell is placed correctly', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[8]![8] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events.find((e) => e.type === 'puzzle')).toBeTruthy();
  });

  test('emits multiple events when one move completes row + col + box at once', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    const types = new Set(events.map((e) => e.type));
    expect(types.has('row')).toBe(true);
    expect(types.has('col')).toBe(true);
    expect(types.has('box')).toBe(true);
  });

  test('emits no events when a placement does not complete any region', () => {
    const before = emptyGrid();
    const after = emptyGrid();
    after[4]![4] = 5;
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events).toEqual([]);
  });

  test('does not mutate either grid', () => {
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    const after = cloneGrid(SEED_GRID_A);
    const beforeCopy = cloneGrid(before);
    const afterCopy = cloneGrid(after);
    detectCompletionEvents(before, after, SEED_GRID_A);
    expect(before).toEqual(beforeCopy);
    expect(after).toEqual(afterCopy);
  });

  // ----- Solution-aware behavior --------------------------------------------

  test('does NOT emit a row event when the row is filled with the wrong values', () => {
    // Take row 0 of SEED_GRID_A and reverse it. The reversed row still
    // contains 1..9 exactly once (so it would pass a "uniqueness" check) but
    // it disagrees with the solution at most cells. Premium VFX must not
    // celebrate this.
    const reversedRow = SEED_GRID_A[0]!.slice().reverse() as number[];
    const before = cloneGrid(SEED_GRID_A);
    for (let c = 0; c < 9; c++) before[0]![c] = null;
    const after = cloneGrid(SEED_GRID_A);
    for (let c = 0; c < 9; c++) after[0]![c] = reversedRow[c]!;
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events.find((e) => e.type === 'row' && e.index === 0)).toBeFalsy();
  });

  test('does NOT emit a puzzle event when the board is full but values are wrong', () => {
    // Swap two cells in row 0 — the board is full, but two cells disagree
    // with the unique solution. No win.
    const before = cloneGrid(SEED_GRID_A);
    before[0]![0] = null;
    before[0]![1] = null;
    const after = cloneGrid(SEED_GRID_A);
    after[0]![0] = SEED_GRID_A[0]![1]!;
    after[0]![1] = SEED_GRID_A[0]![0]!;
    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events.find((e) => e.type === 'puzzle')).toBeFalsy();
  });

  test('does NOT emit a numberSet event when the digit count hits 9 with a wrong placement', () => {
    // Build a grid where digit 5 appears 8 times correctly. Then place a
    // 5 in an empty cell that the solution says should be a 6. Count of 5
    // becomes 9, but one 5 is in the wrong place.
    const target = 5;
    const wrongCell: { r: number; c: number } | null = (() => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (SEED_GRID_A[r]![c] !== target) return { r, c };
        }
      }
      return null;
    })();
    expect(wrongCell).not.toBeNull();
    const { r, c } = wrongCell!;

    const before = cloneGrid(SEED_GRID_A);
    // Remove the solution's actual `target` instance — we're going to
    // reinsert `target` at the wrong cell instead.
    let removed = false;
    for (let rr = 0; rr < 9 && !removed; rr++) {
      for (let cc = 0; cc < 9 && !removed; cc++) {
        if (SEED_GRID_A[rr]![cc] === target) {
          before[rr]![cc] = null;
          removed = true;
        }
      }
    }
    before[r]![c] = null;

    const after = cloneGrid(before);
    after[r]![c] = target; // wrong placement — solution[r][c] !== target

    const events = detectCompletionEvents(before, after, SEED_GRID_A);
    expect(events.find((e) => e.type === 'numberSet' && e.value === target)).toBeFalsy();
  });
});
