/**
 * Tier-derivation tests. Pins every one of the 20 frozen achievement IDs
 * to its expected tier so the App Store Connect → in-app contract stays
 * tight even if point values shift later.
 */

import {
  ALL_ACHIEVEMENT_IDS,
  GAME_CENTER_ACHIEVEMENTS,
} from '@/services/gameCenter';
import {
  getAchievementTier,
  TIER_COLORS,
  type AchievementTier,
} from '../tiers';

const A = GAME_CENTER_ACHIEVEMENTS;

describe('getAchievementTier()', () => {
  it('classifies every declared achievement ID', () => {
    for (const id of ALL_ACHIEVEMENT_IDS) {
      const tier = getAchievementTier(id);
      expect(['bronze', 'silver', 'gold', 'obsidian']).toContain(tier);
    }
  });

  const cases: [ReturnType<typeof Object.values>[number], AchievementTier][] = [
    // BRONZE — 10–20 pts (4)
    [A.FIRST_BLOOM, 'bronze'],
    [A.PERFECT_BLOOM, 'bronze'],
    [A.FIRST_DUEL, 'bronze'],
    [A.TAKE_A_BREATH, 'bronze'],
    // SILVER — 25 pts (7)
    [A.SEED_GROVE_COMPLETE, 'silver'],
    [A.MOONVINE_STREAM_COMPLETE, 'silver'],
    [A.STAR_COLLECTOR, 'silver'],
    [A.LIGHTNING_SOLVE, 'silver'],
    [A.LOGIC_RIVAL, 'silver'],
    [A.FRIENDLY_CHALLENGE, 'silver'],
    [A.NO_HINTS_NEEDED, 'silver'],
    // GOLD — 50–75 pts (7)
    [A.ORACLE_BLOOM_COMPLETE, 'gold'],
    [A.LOGIC_GARDEN_COMPLETE, 'gold'],
    [A.STAR_HARMONY, 'gold'],
    [A.CROWNED_LOGIC, 'gold'],
    [A.PERFECT_SPRINT, 'gold'],
    [A.PERFECT_RIVALRY, 'gold'],
    [A.PERFECT_HARMONY, 'gold'],
    // OBSIDIAN — 100 pts (2)
    [A.PERFECT_CONSTELLATION, 'obsidian'],
    [A.CROWN_GARDEN, 'obsidian'],
  ];

  it.each(cases)('%s → %s', (id, expectedTier) => {
    expect(getAchievementTier(id)).toBe(expectedTier);
  });

  it('partitions the 23 IDs into 5 / 7 / 9 / 2 by tier', () => {
    // 20 World 1 + 3 Astral Nexus (Unlocked 20 → bronze, Complete 40 → gold,
    // Core Perfect 50 → gold).
    const counts: Record<AchievementTier, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      obsidian: 0,
    };
    for (const id of ALL_ACHIEVEMENT_IDS) {
      counts[getAchievementTier(id)] += 1;
    }
    expect(counts).toEqual({ bronze: 5, silver: 7, gold: 9, obsidian: 2 });
  });
});

describe('TIER_COLORS', () => {
  it('defines all four tier entries with required fields', () => {
    for (const tier of ['bronze', 'silver', 'gold', 'obsidian'] as const) {
      const c = TIER_COLORS[tier];
      expect(c.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(c.shadow).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof c.halo).toBe('string');
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});
