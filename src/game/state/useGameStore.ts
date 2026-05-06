import { create } from 'zustand';
import {
  detectCompletionEvents,
  eliminateNotesForPeers,
  generatePuzzle,
  validateMove,
  type CompletionEvent,
  type CompletionTallies,
  type Grid,
  type Level,
  type Puzzle,
} from '@/game/engine';

const UNDO_LIMIT = 20;

interface SelectedCell {
  row: number;
  col: number;
}

export type GameMode = 'campaign' | 'sprint';

export interface ActiveGame {
  /** Drives scoring/timing semantics. `campaign` counts up; `sprint`
   *  counts up too but enforces `timeLimitMs` and times out gracefully. */
  mode: GameMode;
  /** Sprint-only — the leaderboard / mode bucket id. */
  modeId: string | null;
  /** Sprint-only — total allowed playtime in ms. `null` for campaign. */
  timeLimitMs: number | null;
  level: Level;
  puzzle: Puzzle;
  /** Working grid (player edits this). */
  grid: Grid;
  /** Per-cell candidate notes — `notes[r][c]` is a sorted unique array. */
  notes: number[][][];
  selected: SelectedCell | null;
  mistakes: number;
  hintsUsed: number;
  /** ms since `startedAt`, minus all `pausedTotalMs`. Refreshed on each tick. */
  elapsedMs: number;
  /** Wall-clock ms when the session began. */
  startedAt: number;
  /** Cumulative ms the session has been paused (excluded from `elapsedMs`). */
  pausedTotalMs: number;
  /** When in the `paused` state, the wall-clock ms at which we paused. */
  pausedAt: number | null;
  /** `won` = puzzle solved; `timedOut` = sprint clock expired before solve. */
  status: 'playing' | 'paused' | 'won' | 'timedOut';
  /** Consecutive correct placements without a mistake. */
  streak: number;
  /** Max streak observed during this session. */
  bestStreak: number;
  /** Cells currently in conflict with the most recent placement. */
  conflicts: SelectedCell[];
  tallies: CompletionTallies;
  /** Most recent move's completion events — VFX overlay reads this. */
  lastEvents: CompletionEvent[];
  undoStack: UndoFrame[];
}

interface UndoFrame {
  grid: Grid;
  notes: number[][][];
  mistakes: number;
  streak: number;
  conflicts: SelectedCell[];
  tallies: CompletionTallies;
}

interface SprintInput {
  modeId: string;
  level: Level;
  durationSeconds: number;
}

interface GameActions {
  startSession: (level: Level) => void;
  startSprintSession: (input: SprintInput) => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  abandonSession: () => void;
  selectCell: (row: number, col: number) => void;
  toggleNoteMode: () => void;
  placeNumber: (value: number) => void;
  erase: () => void;
  undo: () => void;
  tickTimer: () => void;
  clearLastEvents: () => void;
}

export type GameState = {
  active: ActiveGame | null;
  /** Persists across `placeNumber` calls within a session, resets on
   *  `startSession`. */
  noteMode: boolean;
} & GameActions;

// ----- Helpers -------------------------------------------------------------

function emptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [] as number[]),
  );
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

function cloneNotes(n: number[][][]): number[][][] {
  return n.map((row) => row.map((cell) => cell.slice()));
}

function emptyTallies(): CompletionTallies {
  return { rowsCompleted: 0, colsCompleted: 0, boxesCompleted: 0, numberSetsCompleted: 0, comboCount: 0 };
}

function snapshot(active: ActiveGame): UndoFrame {
  return {
    grid: cloneGrid(active.grid),
    notes: cloneNotes(active.notes),
    mistakes: active.mistakes,
    streak: active.streak,
    conflicts: active.conflicts.slice(),
    tallies: { ...active.tallies },
  };
}

function pushUndo(active: ActiveGame): UndoFrame[] {
  const stack = active.undoStack.length >= UNDO_LIMIT
    ? active.undoStack.slice(-(UNDO_LIMIT - 1))
    : active.undoStack.slice();
  stack.push(snapshot(active));
  return stack;
}

function bumpTallies(prev: CompletionTallies, events: CompletionEvent[]): CompletionTallies {
  const out: CompletionTallies = { ...prev };
  let extras = 0;
  for (const ev of events) {
    if (ev.type === 'row') out.rowsCompleted++;
    else if (ev.type === 'col') out.colsCompleted++;
    else if (ev.type === 'box') out.boxesCompleted++;
    else if (ev.type === 'numberSet') out.numberSetsCompleted++;
  }
  extras = events.filter((e) => e.type !== 'puzzle').length;
  if (extras >= 2) out.comboCount++;
  return out;
}

// Module-scoped timer so the store can drive its own tick without leaking
// timers into screen lifecycle.
let tickIntervalHandle: ReturnType<typeof setInterval> | null = null;

function startTimerInterval() {
  if (tickIntervalHandle) return;
  tickIntervalHandle = setInterval(() => {
    useGameStore.getState().tickTimer();
  }, 1000);
}

function stopTimerInterval() {
  if (tickIntervalHandle) {
    clearInterval(tickIntervalHandle);
    tickIntervalHandle = null;
  }
}

// ----- Store ---------------------------------------------------------------

export const useGameStore = create<GameState>((set, get) => ({
  active: null,
  noteMode: false,
  startSession: (level) => {
    const puzzle = generatePuzzle(level.seed, level.difficulty);
    const initial: ActiveGame = {
      mode: 'campaign',
      modeId: null,
      timeLimitMs: null,
      level,
      puzzle,
      grid: cloneGrid(puzzle.given),
      notes: emptyNotes(),
      selected: null,
      mistakes: 0,
      hintsUsed: 0,
      elapsedMs: 0,
      startedAt: Date.now(),
      pausedTotalMs: 0,
      pausedAt: null,
      status: 'playing',
      streak: 0,
      bestStreak: 0,
      conflicts: [],
      tallies: emptyTallies(),
      lastEvents: [],
      undoStack: [],
    };
    set({ active: initial, noteMode: false });
    startTimerInterval();
  },
  startSprintSession: ({ modeId, level, durationSeconds }) => {
    const puzzle = generatePuzzle(level.seed, level.difficulty);
    const initial: ActiveGame = {
      mode: 'sprint',
      modeId,
      timeLimitMs: durationSeconds * 1000,
      level,
      puzzle,
      grid: cloneGrid(puzzle.given),
      notes: emptyNotes(),
      selected: null,
      mistakes: 0,
      hintsUsed: 0,
      elapsedMs: 0,
      startedAt: Date.now(),
      pausedTotalMs: 0,
      pausedAt: null,
      status: 'playing',
      streak: 0,
      bestStreak: 0,
      conflicts: [],
      tallies: emptyTallies(),
      lastEvents: [],
      undoStack: [],
    };
    set({ active: initial, noteMode: false });
    startTimerInterval();
  },
  endSession: () => {
    stopTimerInterval();
    // Don't clear `active` here — Results screen reads it. The next
    // `startSession` will replace it.
  },
  pauseSession: () => {
    const a = get().active;
    if (!a || a.status !== 'playing') return;
    stopTimerInterval();
    set({
      active: {
        ...a,
        status: 'paused',
        pausedAt: Date.now(),
      },
    });
  },
  resumeSession: () => {
    const a = get().active;
    if (!a || a.status !== 'paused') return;
    // Fold the pause window into `pausedTotalMs` so the displayed timer
    // doesn't jump on resume. Wall-clock-correct without trusting JS timers
    // across iOS background suspension.
    const now = Date.now();
    const delta = a.pausedAt != null ? Math.max(0, now - a.pausedAt) : 0;
    set({
      active: {
        ...a,
        status: 'playing',
        pausedAt: null,
        pausedTotalMs: a.pausedTotalMs + delta,
      },
    });
    startTimerInterval();
  },
  abandonSession: () => {
    stopTimerInterval();
    set({ active: null, noteMode: false });
  },
  selectCell: (row, col) => {
    const a = get().active;
    if (!a) return;
    // Selecting a different cell always clears stale conflict highlights.
    // The persistent "this placement is wrong vs the solution" indication
    // is computed from grid/solution at render time (`selectCellMistake`),
    // so the player still sees their mistakes — only the transient
    // row/col/box conflict ring fades when they move on.
    const isSame = a.selected && a.selected.row === row && a.selected.col === col;
    set({
      active: {
        ...a,
        selected: { row, col },
        conflicts: isSame ? a.conflicts : [],
      },
    });
  },
  toggleNoteMode: () => {
    set({ noteMode: !get().noteMode });
  },
  placeNumber: (value) => {
    const state = get();
    const a = state.active;
    if (!a || a.status !== 'playing' || !a.selected) return;
    const { row, col } = a.selected;
    if (a.puzzle.given[row]![col] != null) return; // can't edit givens

    if (state.noteMode) {
      // Toggle note for `value`
      const undoStack = pushUndo(a);
      const notes = cloneNotes(a.notes);
      const cell = notes[row]![col]!;
      const idx = cell.indexOf(value);
      if (idx >= 0) cell.splice(idx, 1);
      else {
        cell.push(value);
        cell.sort((x, y) => x - y);
      }
      set({ active: { ...a, notes, undoStack, lastEvents: [] } });
      return;
    }

    // Value placement
    const previousValue = a.grid[row]![col];
    if (previousValue === value) return; // no-op

    const undoStack = pushUndo(a);
    const next = cloneGrid(a.grid);
    next[row]![col] = value;
    // Clear notes on the cell when committing a value
    const nextNotes = cloneNotes(a.notes);
    nextNotes[row]![col] = [];

    const validation = validateMove(a.grid, a.puzzle.solution, row, col, value);
    let { mistakes, streak, bestStreak } = a;
    if (validation.correct) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
      // Auto-eliminate: a correct placement of `value` makes that digit
      // logically impossible everywhere it shares a row, column, or 3×3
      // box with the placed cell. Premium Sudoku apps strip those notes
      // automatically so the player doesn't have to chase deductions
      // they've already proven. We only do this on a *correct* placement
      // — a wrong placement doesn't actually eliminate anything, so
      // pruning notes on it would silently destroy player work.
      eliminateNotesForPeers(nextNotes, row, col, value);
    } else {
      mistakes += 1;
      streak = 0;
    }

    const events = detectCompletionEvents(a.grid, next, a.puzzle.solution);
    const tallies = bumpTallies(a.tallies, events);
    const status: ActiveGame['status'] = events.some((e) => e.type === 'puzzle')
      ? 'won'
      : a.status;

    if (status === 'won') stopTimerInterval();

    set({
      active: {
        ...a,
        grid: next,
        notes: nextNotes,
        mistakes,
        streak,
        bestStreak,
        conflicts: validation.conflicts,
        tallies,
        lastEvents: events,
        undoStack,
        status,
      },
    });
  },
  erase: () => {
    const a = get().active;
    if (!a || a.status !== 'playing' || !a.selected) return;
    const { row, col } = a.selected;
    if (a.puzzle.given[row]![col] != null) return;
    const isEmpty = a.grid[row]![col] == null && (a.notes[row]![col]?.length ?? 0) === 0;
    if (isEmpty) return;
    const undoStack = pushUndo(a);
    const grid = cloneGrid(a.grid);
    grid[row]![col] = null;
    const notes = cloneNotes(a.notes);
    notes[row]![col] = [];
    set({ active: { ...a, grid, notes, conflicts: [], lastEvents: [], undoStack } });
  },
  undo: () => {
    const a = get().active;
    if (!a || a.status !== 'playing' || a.undoStack.length === 0) return;
    const stack = a.undoStack.slice();
    const frame = stack.pop()!;
    set({
      active: {
        ...a,
        grid: frame.grid,
        notes: frame.notes,
        mistakes: frame.mistakes,
        streak: frame.streak,
        conflicts: frame.conflicts,
        tallies: frame.tallies,
        lastEvents: [],
        undoStack: stack,
      },
    });
  },
  tickTimer: () => {
    const a = get().active;
    if (!a || a.status !== 'playing') return;
    const next = Math.max(0, Date.now() - a.startedAt - a.pausedTotalMs);
    // Sprint mode: clock-based forced end. The session goes into `timedOut`
    // and the timer interval shuts off so we don't keep ticking.
    if (a.timeLimitMs != null && next >= a.timeLimitMs) {
      stopTimerInterval();
      set({
        active: { ...a, elapsedMs: a.timeLimitMs, status: 'timedOut' },
      });
      return;
    }
    set({ active: { ...a, elapsedMs: next } });
  },
  clearLastEvents: () => {
    const a = get().active;
    if (!a || a.lastEvents.length === 0) return;
    set({ active: { ...a, lastEvents: [] } });
  },
}));

// ----- Granular selectors --------------------------------------------------
// These keep components subscribing narrowly, so a cell only re-renders when
// its own value/note/highlight relevant slice changes.

export const selectActive = (s: GameState) => s.active;
export const selectSelected = (s: GameState) => s.active?.selected ?? null;
export const selectNoteMode = (s: GameState) => s.noteMode;
export const selectLastEvents = (s: GameState) => s.active?.lastEvents ?? [];

/**
 * Sprint-only: ms remaining before the session times out. `null` for
 * campaign mode (no clock-based end). Saturates at 0 once expired so UIs
 * can format `00:00` instead of negative numbers.
 */
export const selectTimeRemainingMs = (s: GameState): number | null => {
  const a = s.active;
  if (!a || a.timeLimitMs == null) return null;
  return Math.max(0, a.timeLimitMs - a.elapsedMs);
};

export function selectCellValue(row: number, col: number) {
  return (s: GameState): number | null => s.active?.grid[row]?.[col] ?? null;
}

export function selectCellNotes(row: number, col: number) {
  return (s: GameState): number[] => s.active?.notes[row]?.[col] ?? [];
}

export function selectCellGiven(row: number, col: number) {
  return (s: GameState): boolean => s.active?.puzzle.given[row]?.[col] != null;
}

export function selectCellConflict(row: number, col: number) {
  return (s: GameState): boolean => {
    const conflicts = s.active?.conflicts;
    if (!conflicts) return false;
    return conflicts.some((p) => p.row === row && p.col === col);
  };
}

/**
 * True iff the cell currently holds a non-given value that does not match
 * the puzzle's unique solution. Persistent across selection changes — this
 * is what the player should see as "still wrong" until they erase or
 * correct it. Givens are never mistakes.
 */
export function selectCellMistake(row: number, col: number) {
  return (s: GameState): boolean => {
    const a = s.active;
    if (!a) return false;
    if (a.puzzle.given[row]?.[col] != null) return false; // givens can't be wrong
    const v = a.grid[row]?.[col];
    if (v == null) return false;
    return v !== a.puzzle.solution[row]?.[col];
  };
}
