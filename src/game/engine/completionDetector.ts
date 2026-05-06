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

/** True iff every filled cell in row `r` matches `solution`. */
function isRowCorrect(grid: Grid, solution: Grid, r: number): boolean {
  const row = grid[r]!;
  const sol = solution[r]!;
  for (let c = 0; c < 9; c++) {
    const v = row[c];
    if (v == null) return false;
    if (v !== sol[c]) return false;
  }
  return true;
}

function isColCorrect(grid: Grid, solution: Grid, c: number): boolean {
  for (let r = 0; r < 9; r++) {
    const v = grid[r]![c];
    if (v == null) return false;
    if (v !== solution[r]![c]) return false;
  }
  return true;
}

function isBoxCorrect(grid: Grid, solution: Grid, b: number): boolean {
  const br = Math.floor(b / 3) * 3;
  const bc = (b % 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      const v = grid[r]![c];
      if (v == null) return false;
      if (v !== solution[r]![c]) return false;
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

/** True iff every cell in `grid` holding `value` matches the solution there. */
function isDigitPlacedCorrectly(grid: Grid, solution: Grid, value: number): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] === value && solution[r]![c] !== value) return false;
    }
  }
  return true;
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

function gridMatchesSolution(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] !== solution[r]![c]) return false;
    }
  }
  return true;
}

/**
 * Diff `previous` against `next` and emit one event per region (row, col,
 * box, numberSet) that just transitioned from "incomplete" → "completed
 * **and** correct", plus a `puzzle` event when the entire grid matches the
 * solution.
 *
 * **Solution-aware:** filling a region with the wrong values (e.g. a row
 * that holds 1..9 but in the wrong order vs the puzzle's unique solution)
 * does NOT fire a completion event. This keeps celebratory VFX honest —
 * sweeps, beams, bursts, and the Logic Bloom only play when the player
 * actually solved that region.
 *
 * Order is stable: rows, then cols, then boxes, then numberSets, then
 * puzzle. The caller infers a combo when `events.length >= 2`.
 *
 * Pure: does not mutate either grid.
 */
export function detectCompletionEvents(
  previous: Grid,
  next: Grid,
  solution: Grid,
): CompletionEvent[] {
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

  // Rows that became full + correct this step (and weren't already full
  // beforehand — `previous` was incomplete so couldn't have been "complete"
  // by either definition).
  const seenRows = new Set<number>();
  for (const { r } of newlyFilled) {
    if (seenRows.has(r)) continue;
    if (
      isRowFull(next, r) &&
      isRowCorrect(next, solution, r) &&
      !isRowFull(previous, r)
    ) {
      events.push({ type: 'row', index: r });
    }
    seenRows.add(r);
  }

  const seenCols = new Set<number>();
  for (const { c } of newlyFilled) {
    if (seenCols.has(c)) continue;
    if (
      isColFull(next, c) &&
      isColCorrect(next, solution, c) &&
      !isColFull(previous, c)
    ) {
      events.push({ type: 'col', index: c });
    }
    seenCols.add(c);
  }

  const seenBoxes = new Set<number>();
  for (const { r, c } of newlyFilled) {
    const b = boxIndex(r, c);
    if (seenBoxes.has(b)) continue;
    if (
      isBoxFull(next, b) &&
      isBoxCorrect(next, solution, b) &&
      !isBoxFull(previous, b)
    ) {
      events.push({ type: 'box', index: b });
    }
    seenBoxes.add(b);
  }

  // Number sets: digit count went < 9 → 9, AND every cell holding `v`
  // matches the solution. The latter check guards against the player
  // having previously placed `v` in a wrong cell that happens to also be
  // empty in the solution.
  const seenDigits = new Set<number>();
  for (const { v } of newlyFilled) {
    if (seenDigits.has(v)) continue;
    const nextCount = countDigit(next, v);
    const prevCount = countDigit(previous, v);
    if (
      nextCount === 9 &&
      prevCount < 9 &&
      isDigitPlacedCorrectly(next, solution, v)
    ) {
      events.push({ type: 'numberSet', value: v });
    }
    seenDigits.add(v);
  }

  // Puzzle complete: every cell matches the solution. Strict equality —
  // a "full but wrong" board does not win.
  if (
    totalFilled(next) === 81 &&
    totalFilled(previous) < 81 &&
    gridMatchesSolution(next, solution)
  ) {
    events.push({ type: 'puzzle' });
  }

  return events;
}
