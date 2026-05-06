/**
 * Pure-TypeScript Sudoku engine types. Zero React Native imports — these
 * types must remain JSON-serializable so saved sessions and puzzles round-trip
 * through MMKV without bespoke (de)serialization.
 */

/** A single cell value: 1-9, or `null` for an empty cell. */
export type CellValue = number | null;

/** 9x9 grid. Always exactly 9 rows × 9 columns. */
export type Grid = CellValue[][];

/**
 * Per-cell candidate notes. `notes[r][c]` is a sorted unique array of digits
 * 1-9 the player has flagged. Stored as `number[][][]` (not `Set[][]`) so it
 * survives JSON.stringify cleanly.
 */
export type CandidateMap = number[][][];

export type Difficulty = 'tutorial' | 'easy' | 'medium' | 'hard';

export interface Puzzle {
  /** Stable string seed; same seed → identical puzzle every time. */
  seed: string;
  difficulty: Difficulty;
  /** The grid as presented to the player (with holes). */
  given: Grid;
  /** The unique solved grid. */
  solution: Grid;
  /** Epoch ms — purely informational, never used by deterministic logic. */
  generatedAt: number;
  /** How many cells were left blank in `given`. */
  holeCount: number;
}

export interface Move {
  row: number;
  col: number;
  /** `null` clears a cell (erase). Note-mode moves use `noteValue` instead. */
  value: CellValue;
  /** When set, the move is a note toggle for the given digit (1-9). */
  noteValue?: number;
  isNote: boolean;
  timestamp: number;
}

export interface MoveValidationResult {
  /** True iff placing `value` at (row,col) doesn't conflict with existing cells. */
  valid: boolean;
  /** All cells (including the cell itself) that already hold `value` in the same row/col/box. */
  conflicts: { row: number; col: number }[];
  /** True iff `value` matches the solution at (row,col). */
  correct: boolean;
}

export type CompletionEvent =
  | { type: 'row'; index: number }
  | { type: 'col'; index: number }
  | { type: 'box'; index: number }
  | { type: 'numberSet'; value: number }
  | { type: 'puzzle' };

export interface GameSession {
  puzzleId: string;
  seed: string;
  levelId: string;
  startedAt: number;
  /** ms elapsed since session start, persisted across timer ticks. */
  elapsedMs: number;
  currentGrid: Grid;
  notes: CandidateMap;
  moves: Move[];
  mistakes: number;
  hintsUsed: number;
  /** Consecutive correct placements without a mistake. Resets on mistake. */
  streak: number;
  currentScore: number;
}

export interface ScoreBreakdown {
  base: number;
  rowBonus: number;
  colBonus: number;
  boxBonus: number;
  numberSetBonus: number;
  comboBonus: number;
  noMistakeBonus: number;
  noHintBonus: number;
  timeBonus: number;
  streakMultiplier: number;
  total: number;
}

export interface StarResult {
  stars: 1 | 2 | 3;
  crown: boolean;
}

/** A campaign level — engine consumes only the score-relevant fields. */
export interface Level {
  id: string;
  worldId: string;
  index: number;
  difficulty: Difficulty;
  seed: string;
  /** Target time in seconds; time bonus computed against this. */
  targetTimeSeconds: number;
  twoStarThreshold: number;
  threeStarThreshold: number;
}

/** Per-region completion totals used by the scoring pipeline. */
export interface CompletionTallies {
  rowsCompleted: number;
  colsCompleted: number;
  boxesCompleted: number;
  numberSetsCompleted: number;
  /** Number of moves that fired ≥2 completion events at once. */
  comboCount: number;
}
