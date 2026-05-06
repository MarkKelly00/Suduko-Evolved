import type { CompletionEvent, Grid } from './types';
import { boxIndex } from './sudokuSolver';

function isRowFull(grid: Grid, r: number): boolean {
  const row = grid[r]!;
  for (let c = 0; c < 9; c++) if (row[c] == null) return false;
  return true;
}

function isColFull(grid: Grid, c: number): boolean {
  for (let r = 0; r < 9; r++) if (grid[r]![c] == null) return false;
  return true;
}

function isBoxFull(grid: Grid, b: number): boolean {
  const br = Math.floor(b / 3) * 3;
  const bc = (b % 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r]![c] == null) return false;
    }
  }
  return true;
}

function countDigit(grid: Grid, value: number): number {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] === value) n++;
    }
  }
  return n;
}

function totalFilled(grid: Grid): number {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] != null) n++;
    }
  }
  return n;
}

/**
 * Diff `previous` against `next` and emit one event per region (row, col,
 * box, numberSet) that just transitioned from "incomplete" → "complete", plus
 * a `puzzle` event when the final cell is placed.
 *
 * Order is stable: rows, then cols, then boxes, then numberSets, then puzzle.
 * This lets the UI fire effects in a satisfying sequence without needing to
 * know about combos — the caller infers a combo when `events.length >= 2`.
 *
 * Pure: does not mutate either grid.
 */
export function detectCompletionEvents(previous: Grid, next: Grid): CompletionEvent[] {
  const events: CompletionEvent[] = [];

  const newlyFilled: { r: number; c: number; v: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const before = previous[r]![c];
      const after = next[r]![c];
      if (before == null && after != null) {
        newlyFilled.push({ r, c, v: after });
      }
    }
  }
  if (newlyFilled.length === 0) return events;

  // Rows that became full this step
  const seenRows = new Set<number>();
  for (const { r } of newlyFilled) {
    if (seenRows.has(r)) continue;
    if (isRowFull(next, r) && !isRowFull(previous, r)) {
      events.push({ type: 'row', index: r });
    }
    seenRows.add(r);
  }

  // Cols that became full this step
  const seenCols = new Set<number>();
  for (const { c } of newlyFilled) {
    if (seenCols.has(c)) continue;
    if (isColFull(next, c) && !isColFull(previous, c)) {
      events.push({ type: 'col', index: c });
    }
    seenCols.add(c);
  }

  // Boxes that became full this step
  const seenBoxes = new Set<number>();
  for (const { r, c } of newlyFilled) {
    const b = boxIndex(r, c);
    if (seenBoxes.has(b)) continue;
    if (isBoxFull(next, b) && !isBoxFull(previous, b)) {
      events.push({ type: 'box', index: b });
    }
    seenBoxes.add(b);
  }

  // Number sets: digit count went 8→9 (or fewer→9 if multiple cells were filled in the same step)
  const seenDigits = new Set<number>();
  for (const { v } of newlyFilled) {
    if (seenDigits.has(v)) continue;
    const nextCount = countDigit(next, v);
    const prevCount = countDigit(previous, v);
    if (nextCount === 9 && prevCount < 9) {
      events.push({ type: 'numberSet', value: v });
    }
    seenDigits.add(v);
  }

  // Puzzle complete
  if (totalFilled(next) === 81 && totalFilled(previous) < 81) {
    events.push({ type: 'puzzle' });
  }

  return events;
}
