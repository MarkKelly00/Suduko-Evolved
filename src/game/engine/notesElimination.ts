/**
 * Pure note-elimination helpers.
 *
 * When a player correctly places a digit, that digit is logically
 * impossible everywhere it shares a row, column, or 3×3 box with the
 * placement. Premium Sudoku apps strip those candidate notes
 * automatically so the player isn't asked to chase deductions they've
 * already proven.
 *
 * These helpers are pure (modulo the in-place mutation of the array
 * the caller passes in) so they live in the engine and can be unit
 * tested without React Native.
 */

import type { CandidateMap } from './types';

/**
 * Mutates `notes` in place: removes `value` from every cell that shares
 * a row, column, or 3×3 box with `(row, col)`. Skips the placement cell
 * itself — the caller is expected to clear that cell's notes
 * separately when committing the value.
 *
 * Pass a fresh clone of the previous notes object so undo can restore
 * the prior state.
 */
export function eliminateNotesForPeers(
  notes: CandidateMap,
  row: number,
  col: number,
  value: number,
): void {
  if (row < 0 || row > 8 || col < 0 || col > 8) return;
  if (value < 1 || value > 9) return;
  // Row peers
  for (let c = 0; c < 9; c++) {
    if (c === col) continue;
    pruneNote(notes, row, c, value);
  }
  // Column peers
  for (let r = 0; r < 9; r++) {
    if (r === row) continue;
    pruneNote(notes, r, col, value);
  }
  // 3×3 box peers
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (r === row && c === col) continue;
      pruneNote(notes, r, c, value);
    }
  }
}

function pruneNote(notes: CandidateMap, row: number, col: number, value: number): void {
  const cell = notes[row]?.[col];
  if (!cell || cell.length === 0) return;
  const idx = cell.indexOf(value);
  if (idx >= 0) cell.splice(idx, 1);
}
