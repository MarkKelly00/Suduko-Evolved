import { generatePuzzle, countSolutions, HOLES, type Grid } from '@/game/engine';
import {
  WORLD_1_LEVELS,
  WORLD_2_LEVELS,
  ALL_LEVELS,
  getLevelById,
  nextLevelId,
  levelIdForGlobal,
  parseLevelId,
} from '../levels';
import {
  isWorldUnlockedByProgress,
  deriveUnlockedWorlds,
  repairUnlockedWorlds,
  unlockGateLevelId,
} from '../worldUnlockRules';

function isValidSolution(g: Grid): boolean {
  for (let i = 0; i < 9; i++) {
    const row = new Set<number>();
    const col = new Set<number>();
    for (let j = 0; j < 9; j++) {
      const rv = g[i]![j];
      const cv = g[j]![i];
      if (rv == null || cv == null) return false;
      row.add(rv);
      col.add(cv);
    }
    if (row.size !== 9 || col.size !== 9) return false;
  }
  for (let bi = 0; bi < 9; bi++) {
    const br = Math.floor(bi / 3) * 3;
    const bc = (bi % 3) * 3;
    const seen = new Set<number>();
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        const v = g[r]![c];
        if (v == null) return false;
        seen.add(v);
      }
    }
    if (seen.size !== 9) return false;
  }
  return true;
}

describe('World 2 (Astral Nexus) content', () => {
  test('defines exactly 30 levels with global ids/indices 31-60', () => {
    expect(WORLD_2_LEVELS).toHaveLength(30);
    WORLD_2_LEVELS.forEach((lvl, i) => {
      const globalIndex = i + 31;
      expect(lvl.index).toBe(globalIndex);
      expect(lvl.id).toBe(`world2-level-${globalIndex}`);
      expect(lvl.worldId).toBe('world2');
    });
  });

  test('difficulty curve: 31-35 medium, 36-55 hard, 56-60 expert', () => {
    const diff = (g: number) => WORLD_2_LEVELS[g - 31]!.difficulty;
    for (let g = 31; g <= 35; g++) expect(diff(g)).toBe('medium');
    for (let g = 36; g <= 55; g++) expect(diff(g)).toBe('hard');
    for (let g = 56; g <= 60; g++) expect(diff(g)).toBe('expert');
  });

  test('World 2 crowns are tighter than World 1 (prestige premium)', () => {
    // Same-difficulty World 1 reference vs World 2: the prestige premium makes
    // the 3-star bar strictly higher and the target time strictly shorter.
    const w1Medium = WORLD_1_LEVELS.find((l) => l.difficulty === 'medium')!;
    const w2Medium = WORLD_2_LEVELS.find((l) => l.difficulty === 'medium')!;
    // Higher global index AND the 1.15 premium → strictly higher thresholds.
    expect(w2Medium.threeStarThreshold).toBeGreaterThan(w1Medium.threeStarThreshold);
    const w1Hard = WORLD_1_LEVELS.find((l) => l.difficulty === 'hard')!;
    const w2Hard = WORLD_2_LEVELS.find((l) => l.difficulty === 'hard')!;
    // World 2 hard target time is the tightened (×0.85) value, below World 1's.
    expect(w2Hard.targetTimeSeconds).toBeLessThan(w1Hard.targetTimeSeconds);
  });

  test('every level id 31-60 maps to content via getLevelById / levelIdForGlobal', () => {
    for (let g = 31; g <= 60; g++) {
      const id = levelIdForGlobal(g);
      expect(id).toBe(`world2-level-${g}`);
      const lvl = getLevelById(id);
      expect(lvl).not.toBeNull();
      expect(lvl!.index).toBe(g);
      expect(parseLevelId(id)).toEqual({ worldId: 'world2', globalIndex: g });
    }
  });

  test('nextLevelId bridges worlds and caps at 60', () => {
    // World 1 → World 2 crossing.
    expect(nextLevelId('world1-level-30')).toBe('world2-level-31');
    // Within World 2.
    expect(nextLevelId('world2-level-45')).toBe('world2-level-46');
    // Finale → null.
    expect(nextLevelId('world2-level-60')).toBeNull();
    // Unknown id → null.
    expect(nextLevelId('bogus-level-1')).toBeNull();
  });

  test('ALL_LEVELS spans 60 unique levels', () => {
    expect(ALL_LEVELS).toHaveLength(60);
    expect(new Set(ALL_LEVELS.map((l) => l.id)).size).toBe(60);
  });

  // Heavy: actually generate every World 2 puzzle from its deterministic seed
  // and prove it is structurally valid AND uniquely solvable.
  test(
    'every World 2 puzzle is valid and has exactly one solution',
    () => {
      for (const lvl of WORLD_2_LEVELS) {
        const puzzle = generatePuzzle(lvl.seed, lvl.difficulty);
        expect(isValidSolution(puzzle.solution)).toBe(true);
        expect(countSolutions(puzzle.given, 2)).toBe(1);
        expect(puzzle.holeCount).toBeLessThanOrEqual(HOLES[lvl.difficulty]);
        // Determinism: regenerating yields an identical board.
        const again = generatePuzzle(lvl.seed, lvl.difficulty);
        expect(again.given).toEqual(puzzle.given);
      }
    },
    120_000,
  );
});

describe('world unlock rules', () => {
  test('World 1 is always unlocked; World 2 gates on level 30', () => {
    expect(isWorldUnlockedByProgress('world1', [])).toBe(true);
    expect(isWorldUnlockedByProgress('world2', [])).toBe(false);
    expect(isWorldUnlockedByProgress('world2', ['world1-level-29'])).toBe(false);
    expect(isWorldUnlockedByProgress('world2', ['world1-level-30'])).toBe(true);
    expect(unlockGateLevelId('world2')).toBe('world1-level-30');
    expect(unlockGateLevelId('world1')).toBeNull();
  });

  test('deriveUnlockedWorlds / repairUnlockedWorlds are additive', () => {
    expect(deriveUnlockedWorlds([])).toEqual(['world1']);
    expect(deriveUnlockedWorlds(['world1-level-30'])).toEqual(['world1', 'world2']);
    // repair never removes an already-open world.
    expect(repairUnlockedWorlds(['world1', 'world2'], []).sort()).toEqual(['world1', 'world2']);
    expect(repairUnlockedWorlds(undefined, ['world1-level-30']).sort()).toEqual([
      'world1',
      'world2',
    ]);
  });
});
