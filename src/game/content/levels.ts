import { DEFAULT_TARGET_TIME_S, LEVEL_SEEDS, type Difficulty, type Level } from '@/game/engine';
import { isWorldEnabled } from '@/game/config/featureFlags';
import { WORLD_1, WORLD_2 } from './worlds';

/**
 * Campaign level definitions across both worlds.
 *
 * Levels carry a GLOBAL `index` (1–60). World 1 owns 1–30, World 2 owns 31–60.
 * The id encodes the world and the global index: `world1-level-N` / `world2-level-N`.
 * Keeping the global index inside the id makes every Supabase `level_id` row and
 * every progress key globally unique with zero schema change, and lets the
 * single `LEVEL_SEEDS` map (keyed by global index) feed both worlds.
 *
 * World 1 (Logic Garden) numbers and balance are UNCHANGED from before the
 * Astral Nexus expansion — `WORLD_1_LEVELS`, `levelId`, `difficultyForIndex`,
 * and `starThresholds(..., prestige=false)` all reproduce the original values
 * exactly.
 */

// ---------------------------------------------------------------------------
// Difficulty curves
// ---------------------------------------------------------------------------

/**
 * World 1 difficulty curve (Logic Garden):
 *  - Levels 1–5:   tutorial
 *  - Levels 6–15:  easy
 *  - Levels 16–25: medium
 *  - Levels 26–30: hard
 */
function difficultyForIndex(index: number): Difficulty {
  if (index <= 5) return 'tutorial';
  if (index <= 15) return 'easy';
  if (index <= 25) return 'medium';
  return 'hard';
}

/**
 * World 2 difficulty curve (Astral Nexus, global indices 31–60):
 *  - 31–35: medium  (Prism Causeway warm-up)
 *  - 36–55: hard    (Prism Causeway peak → Starfall Archive)
 *  - 56–60: expert  (Celestial Engine climax)
 * Matches the brief's "31–40 medium→hard, 41–50 hard, 51–60 hard→expert".
 */
function difficultyForWorld2Index(index: number): Difficulty {
  if (index <= 35) return 'medium';
  if (index <= 55) return 'hard';
  return 'expert';
}

// ---------------------------------------------------------------------------
// Star / crown / time targets
// ---------------------------------------------------------------------------

const DIFFICULTY_BOOST: Record<Difficulty, number> = {
  tutorial: 0,
  easy: 200,
  medium: 400,
  hard: 700,
  expert: 1000,
};

/**
 * Star thresholds. Tunable via this single function — score test runs and
 * adjust constants here once players are putting up real numbers.
 *
 * `prestige` (World 2) applies a flat ~15% premium so the same star demands a
 * stronger run than the equivalent World 1 level — "tighter crowns" without an
 * unfair spike. World 1 calls with `prestige=false`, reproducing the original
 * `800 + index*40 + boost` / `1400 + index*70 + boost` numbers exactly.
 */
function starThresholds(
  index: number,
  difficulty: Difficulty,
  prestige: boolean,
): { two: number; three: number } {
  const difficultyBoost = DIFFICULTY_BOOST[difficulty];
  const premium = prestige ? 1.15 : 1;
  const two = Math.round((800 + index * 40 + difficultyBoost) * premium);
  const three = Math.round((1400 + index * 70 + difficultyBoost) * premium);
  return { two, three };
}

/** Target clear time in seconds. World 2 tightens the World-1 defaults by 15%
 *  so a crown (3★ + clean + within target) is a genuine prestige feat. */
function targetTimeFor(difficulty: Difficulty, prestige: boolean): number {
  const base = DEFAULT_TARGET_TIME_S[difficulty];
  return prestige ? Math.round(base * 0.85) : base;
}

// ---------------------------------------------------------------------------
// Level builders
// ---------------------------------------------------------------------------

function buildLevel(index: number): Level {
  const difficulty = difficultyForIndex(index);
  const seed = LEVEL_SEEDS[index]!;
  const targetTimeSeconds = targetTimeFor(difficulty, false);
  const { two, three } = starThresholds(index, difficulty, false);
  return {
    id: levelId(index),
    worldId: WORLD_1.id,
    index,
    difficulty,
    seed,
    targetTimeSeconds,
    twoStarThreshold: two,
    threeStarThreshold: three,
  };
}

function buildWorld2Level(index: number): Level {
  const difficulty = difficultyForWorld2Index(index);
  const seed = LEVEL_SEEDS[index]!;
  const targetTimeSeconds = targetTimeFor(difficulty, true);
  const { two, three } = starThresholds(index, difficulty, true);
  return {
    id: world2LevelId(index),
    worldId: WORLD_2.id,
    index,
    difficulty,
    seed,
    targetTimeSeconds,
    twoStarThreshold: two,
    threeStarThreshold: three,
  };
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

/** World 1 level id for a global index 1–30. */
export function levelId(index: number): string {
  return `world1-level-${index}`;
}

/** World 2 level id for a global index 31–60. */
export function world2LevelId(index: number): string {
  return `world2-level-${index}`;
}

/** Map any global level number (1–60) to its level id, world-aware. */
export function levelIdForGlobal(globalIndex: number): string {
  return globalIndex <= WORLD_1.levelCount
    ? levelId(globalIndex)
    : world2LevelId(globalIndex);
}

/** Parse a level id into `{ worldId, globalIndex }`, or null if unrecognized. */
export function parseLevelId(
  id: string,
): { worldId: string; globalIndex: number } | null {
  const m = /^(world[12])-level-(\d+)$/.exec(id);
  if (!m) return null;
  return { worldId: m[1]!, globalIndex: parseInt(m[2]!, 10) };
}

// ---------------------------------------------------------------------------
// Level collections
// ---------------------------------------------------------------------------

/** All World 1 levels in order. Global indices 1..30. */
export const WORLD_1_LEVELS: Level[] = Array.from({ length: 30 }, (_, i) => buildLevel(i + 1));

/** All World 2 levels in order. Global indices 31..60. */
export const WORLD_2_LEVELS: Level[] = Array.from({ length: 30 }, (_, i) => buildWorld2Level(i + 31));

/** Every campaign level across all worlds, 1..60. */
export const ALL_LEVELS: Level[] = [...WORLD_1_LEVELS, ...WORLD_2_LEVELS];

export function getLevelById(id: string): Level | null {
  return ALL_LEVELS.find((l) => l.id === id) ?? null;
}

/** Levels for a specific world id (`world1` | `world2`). */
export function getLevelsForWorld(worldId: string): Level[] {
  return ALL_LEVELS.filter((l) => l.worldId === worldId);
}

/**
 * The level that unlocks when `currentId` is completed.
 *
 * Increments the global index and maps back to a level id, so completing the
 * last World 1 level (`world1-level-30`) unlocks the first World 2 level
 * (`world2-level-31`) — the continuous saga crossing. The crossing is gated by
 * `enableAstralNexus`: if World 2 is disabled, finishing level 30 unlocks
 * nothing (exactly the pre-expansion behavior). Returns null past level 60.
 */
export function nextLevelId(currentId: string): string | null {
  const current = getLevelById(currentId);
  if (!current) return null;
  const nextGlobal = current.index + 1;
  if (nextGlobal > WORLD_1.levelCount + WORLD_2.levelCount) return null;
  const nextId = levelIdForGlobal(nextGlobal);
  const next = getLevelById(nextId);
  if (!next) return null;
  // Don't cross into a disabled world.
  if (next.worldId !== current.worldId && !isWorldEnabled(next.worldId)) {
    return null;
  }
  return nextId;
}
