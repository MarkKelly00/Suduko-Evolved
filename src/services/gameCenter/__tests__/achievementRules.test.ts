/**
 * Tests for the achievement rules engine.
 *
 * The engine is a pure function — input event, output submissions.
 * These tests pin every event variant + percent calculation so the
 * App Store Connect contract (20 achievements, 910 total points)
 * doesn't drift silently.
 */

import {
  ACHIEVEMENT_POINTS,
  ALL_ACHIEVEMENT_IDS,
  GAME_CENTER_ACHIEVEMENTS,
} from '../gameCenterIds';
import {
  evaluate,
  evaluateAll,
  type AchievementEvent,
} from '../../../game/achievements/achievementRules';

describe('achievement IDs + points', () => {
  it('declares exactly 23 achievement IDs', () => {
    // 20 World 1 + 3 World 2 (Astral Nexus).
    expect(ALL_ACHIEVEMENT_IDS.length).toBe(23);
  });

  it('sums to 910 points across all achievements', () => {
    // World 1's 800 (10, 20, 25, 25, 50, 75, 25, 50, 100, 50, 100, 25, 50,
    // 10, 25, 50, 25, 50, 25, 10) + Astral Nexus's 110 (20 + 40 + 50) = 910.
    // Apple's per-app cap is 1000; 910 leaves 90 of headroom for World 3.
    const sum = Object.values(ACHIEVEMENT_POINTS).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(910);
  });

  it('has a point value for every declared ID', () => {
    for (const id of ALL_ACHIEVEMENT_IDS) {
      expect(typeof ACHIEVEMENT_POINTS[id]).toBe('number');
      expect(ACHIEVEMENT_POINTS[id]).toBeGreaterThan(0);
    }
  });
});

describe('evaluate() — single-event achievements', () => {
  it('campaignLevelCompleted → FIRST_BLOOM at 100%', () => {
    expect(evaluate({ kind: 'campaignLevelCompleted', level: 1 })).toEqual([
      {
        achievementId: GAME_CENTER_ACHIEVEMENTS.FIRST_BLOOM,
        percentComplete: 100,
      },
    ]);
  });

  it('crownEarned → PERFECT_BLOOM at 100%', () => {
    expect(evaluate({ kind: 'crownEarned' })).toEqual([
      {
        achievementId: GAME_CENTER_ACHIEVEMENTS.PERFECT_BLOOM,
        percentComplete: 100,
      },
    ]);
  });

  it('sprintCompleted with cleared=true → LIGHTNING_SOLVE', () => {
    expect(evaluate({ kind: 'sprintCompleted', cleared: true })).toEqual([
      {
        achievementId: GAME_CENTER_ACHIEVEMENTS.LIGHTNING_SOLVE,
        percentComplete: 100,
      },
    ]);
  });

  it('sprintCompleted with cleared=false → no submissions', () => {
    expect(evaluate({ kind: 'sprintCompleted', cleared: false })).toEqual([]);
  });

  it('sprintPerfectCompleted → PERFECT_SPRINT', () => {
    expect(evaluate({ kind: 'sprintPerfectCompleted' })).toEqual([
      {
        achievementId: GAME_CENTER_ACHIEVEMENTS.PERFECT_SPRINT,
        percentComplete: 100,
      },
    ]);
  });

  it('duel single events all map to 100% submissions', () => {
    const cases: Array<[AchievementEvent['kind'], string]> = [
      ['duelCompleted', GAME_CENTER_ACHIEVEMENTS.FIRST_DUEL],
      ['duelWon', GAME_CENTER_ACHIEVEMENTS.LOGIC_RIVAL],
      ['duelPerfectWin', GAME_CENTER_ACHIEVEMENTS.PERFECT_RIVALRY],
      ['friendChallenged', GAME_CENTER_ACHIEVEMENTS.FRIENDLY_CHALLENGE],
      ['noHintClear', GAME_CENTER_ACHIEVEMENTS.NO_HINTS_NEEDED],
      ['pausedAndCompleted', GAME_CENTER_ACHIEVEMENTS.TAKE_A_BREATH],
    ];
    for (const [kind, expectedId] of cases) {
      const result = evaluate({ kind } as AchievementEvent);
      expect(result).toEqual([
        { achievementId: expectedId, percentComplete: 100 },
      ]);
    }
  });

  it('multiRegionCompletion >= 3 → PERFECT_HARMONY; < 3 → []', () => {
    expect(
      evaluate({ kind: 'multiRegionCompletion', regionCount: 3 }),
    ).toEqual([
      {
        achievementId: GAME_CENTER_ACHIEVEMENTS.PERFECT_HARMONY,
        percentComplete: 100,
      },
    ]);
    expect(
      evaluate({ kind: 'multiRegionCompletion', regionCount: 2 }),
    ).toEqual([]);
    expect(
      evaluate({ kind: 'multiRegionCompletion', regionCount: 0 }),
    ).toEqual([]);
  });
});

describe('evaluate() — count-based achievements', () => {
  it('starsUpdated returns 3 rows scaled to 30/60/90', () => {
    const out = evaluate({ kind: 'starsUpdated', totalStars: 30 });
    expect(out).toHaveLength(3);
    const map = new Map(out.map((s) => [s.achievementId, s.percentComplete]));
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.STAR_COLLECTOR)).toBe(100);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.STAR_HARMONY)).toBe(50);
    expect(
      map.get(GAME_CENTER_ACHIEVEMENTS.PERFECT_CONSTELLATION),
    ).toBeCloseTo(100 / 3);
  });

  it('starsUpdated clamps to 100 above thresholds', () => {
    const out = evaluate({ kind: 'starsUpdated', totalStars: 90 });
    for (const s of out) expect(s.percentComplete).toBe(100);
  });

  it('crownsUpdated returns 2 rows scaled to 10/30', () => {
    const out = evaluate({ kind: 'crownsUpdated', totalCrowns: 10 });
    const map = new Map(out.map((s) => [s.achievementId, s.percentComplete]));
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.CROWNED_LOGIC)).toBe(100);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.CROWN_GARDEN)).toBeCloseTo(
      (10 / 30) * 100,
    );
  });

  it('worldProgressUpdated returns 4 rows (per-act + total)', () => {
    const out = evaluate({
      kind: 'worldProgressUpdated',
      seedGroveCleared: 10,
      moonvineStreamCleared: 5,
      oracleBloomCleared: 0,
    });
    expect(out).toHaveLength(4);
    const map = new Map(out.map((s) => [s.achievementId, s.percentComplete]));
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.SEED_GROVE_COMPLETE)).toBe(100);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.MOONVINE_STREAM_COMPLETE)).toBe(50);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.ORACLE_BLOOM_COMPLETE)).toBe(0);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.LOGIC_GARDEN_COMPLETE)).toBe(50);
  });

  it('worldProgressUpdated saturates at 100 for full clear', () => {
    const out = evaluate({
      kind: 'worldProgressUpdated',
      seedGroveCleared: 10,
      moonvineStreamCleared: 10,
      oracleBloomCleared: 10,
    });
    for (const s of out) expect(s.percentComplete).toBe(100);
  });

  it('world2ProgressUpdated maps unlock + completion percent', () => {
    const out = evaluate({
      kind: 'world2ProgressUpdated',
      unlocked: true,
      clearedCount: 15,
    });
    const map = new Map(out.map((s) => [s.achievementId, s.percentComplete]));
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_UNLOCKED)).toBe(100);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_COMPLETE)).toBe(50);
  });

  it('world2ProgressUpdated keeps unlocked at 0 before the gate', () => {
    const out = evaluate({
      kind: 'world2ProgressUpdated',
      unlocked: false,
      clearedCount: 0,
    });
    const map = new Map(out.map((s) => [s.achievementId, s.percentComplete]));
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_UNLOCKED)).toBe(0);
    expect(map.get(GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_COMPLETE)).toBe(0);
  });

  it('astralCorePerfect → ASTRAL_CORE_PERFECT at 100%', () => {
    expect(evaluate({ kind: 'astralCorePerfect' })).toEqual([
      {
        achievementId: GAME_CENTER_ACHIEVEMENTS.ASTRAL_CORE_PERFECT,
        percentComplete: 100,
      },
    ]);
  });
});

describe('evaluateAll()', () => {
  it('merges duplicate IDs by max percent', () => {
    const out = evaluateAll([
      { kind: 'starsUpdated', totalStars: 15 }, // STAR_COLLECTOR 50%
      { kind: 'starsUpdated', totalStars: 30 }, // STAR_COLLECTOR 100%
    ]);
    const star = out.find(
      (s) => s.achievementId === GAME_CENTER_ACHIEVEMENTS.STAR_COLLECTOR,
    );
    expect(star?.percentComplete).toBe(100);
  });

  it('flattens disparate events without dropping any', () => {
    const out = evaluateAll([
      { kind: 'campaignLevelCompleted', level: 1 },
      { kind: 'crownEarned' },
      { kind: 'noHintClear' },
    ]);
    const ids = out.map((s) => s.achievementId);
    expect(ids).toContain(GAME_CENTER_ACHIEVEMENTS.FIRST_BLOOM);
    expect(ids).toContain(GAME_CENTER_ACHIEVEMENTS.PERFECT_BLOOM);
    expect(ids).toContain(GAME_CENTER_ACHIEVEMENTS.NO_HINTS_NEEDED);
  });

  it('returns [] for an empty event list', () => {
    expect(evaluateAll([])).toEqual([]);
  });
});
