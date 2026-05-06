import { eliminateNotesForPeers } from '../notesElimination';
import type { CandidateMap } from '../types';

/** Build a 9x9 candidate map where every cell holds the given digit set. */
function fullNotes(seed: number[]): CandidateMap {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => seed.slice()),
  );
}

function emptyNotes(): CandidateMap {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]));
}

describe('eliminateNotesForPeers', () => {
  test('removes value from every cell in the same row', () => {
    const notes = fullNotes([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    eliminateNotesForPeers(notes, 0, 4, 5);
    for (let c = 0; c < 9; c++) {
      const cell = notes[0]![c]!;
      if (c === 4) {
        // Helper deliberately skips the placement cell — caller clears it.
        expect(cell).toContain(5);
      } else {
        expect(cell).not.toContain(5);
      }
    }
  });

  test('removes value from every cell in the same column', () => {
    const notes = fullNotes([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    eliminateNotesForPeers(notes, 3, 7, 2);
    for (let r = 0; r < 9; r++) {
      const cell = notes[r]![7]!;
      if (r === 3) {
        expect(cell).toContain(2);
      } else {
        expect(cell).not.toContain(2);
      }
    }
  });

  test('removes value from every cell in the same 3x3 box', () => {
    const notes = fullNotes([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // Place value 7 at (5, 1) — box index = floor(5/3)*3 + floor(1/3) = 3
    eliminateNotesForPeers(notes, 5, 1, 7);
    // Box 3 spans rows 3..5, cols 0..2.
    for (let r = 3; r <= 5; r++) {
      for (let c = 0; c <= 2; c++) {
        const cell = notes[r]![c]!;
        if (r === 5 && c === 1) {
          expect(cell).toContain(7);
        } else {
          expect(cell).not.toContain(7);
        }
      }
    }
  });

  test('does not affect unrelated cells outside row/col/box', () => {
    const notes = fullNotes([5]);
    eliminateNotesForPeers(notes, 0, 0, 5);
    // (4, 4) is in a different row, column, and box (box 4) than (0, 0).
    expect(notes[4]![4]).toEqual([5]);
    // (8, 8) — different row, col, box.
    expect(notes[8]![8]).toEqual([5]);
  });

  test('preserves other digits in cells where it eliminates the value', () => {
    const notes = fullNotes([3, 5, 7]);
    eliminateNotesForPeers(notes, 0, 0, 5);
    // (0, 4) shares the row — only 5 should disappear.
    expect(notes[0]![4]).toEqual([3, 7]);
    // (4, 0) shares the column — only 5 should disappear.
    expect(notes[4]![0]).toEqual([3, 7]);
    // (1, 1) shares the box — only 5 should disappear.
    expect(notes[1]![1]).toEqual([3, 7]);
    // (4, 4) shares nothing — untouched.
    expect(notes[4]![4]).toEqual([3, 5, 7]);
  });

  test('is a no-op when peer cells already lack the value', () => {
    const notes = emptyNotes();
    expect(() => eliminateNotesForPeers(notes, 0, 0, 5)).not.toThrow();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(notes[r]![c]).toEqual([]);
      }
    }
  });

  test('rejects out-of-range row/col/value silently', () => {
    const notes = fullNotes([5]);
    eliminateNotesForPeers(notes, -1, 0, 5);
    eliminateNotesForPeers(notes, 9, 0, 5);
    eliminateNotesForPeers(notes, 0, -1, 5);
    eliminateNotesForPeers(notes, 0, 9, 5);
    eliminateNotesForPeers(notes, 0, 0, 0);
    eliminateNotesForPeers(notes, 0, 0, 10);
    // None of the above should have touched anything.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(notes[r]![c]).toEqual([5]);
      }
    }
  });
});
