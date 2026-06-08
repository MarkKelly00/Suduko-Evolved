/**
 * Player-facing display metadata for each achievement.
 *
 * The canonical name + description live in App Store Connect (the source
 * of truth for the iOS Game Center modal). We mirror them here so the
 * in-app gallery + unlock toast can render the same strings without a
 * round-trip to GameKit. Keep these aligned with App Store Connect.
 *
 * `category` groups the gallery's sections. `progressLabel` annotates the
 * count-based achievements ("60 of 60 stars") — leave undefined for
 * single-event achievements.
 */

import {
  GAME_CENTER_ACHIEVEMENTS,
  type GameCenterAchievementId,
} from '@/services/gameCenter';

export type AchievementCategory =
  | 'campaign'
  | 'nexus'
  | 'sprint'
  | 'duels'
  | 'social'
  | 'skill'
  | 'mindfulness';

export interface AchievementMetadata {
  name: string;
  description: string;
  category: AchievementCategory;
  /** Optional copy explaining how progress accrues for count-based
   *  achievements (stars, crowns, world progress). */
  progressLabel?: string;
}

const A = GAME_CENTER_ACHIEVEMENTS;

export const ACHIEVEMENT_METADATA: Readonly<
  Record<GameCenterAchievementId, AchievementMetadata>
> = {
  [A.FIRST_BLOOM]: {
    name: 'First Bloom',
    description: 'Clear your first level in Logic Garden.',
    category: 'campaign',
  },
  [A.PERFECT_BLOOM]: {
    name: 'Perfect Bloom',
    description: 'Solve a level cleanly enough to earn a crown.',
    category: 'campaign',
  },
  [A.SEED_GROVE_COMPLETE]: {
    name: 'Seed Grove Complete',
    description: 'Clear every level in the Seed Grove biome.',
    category: 'campaign',
    progressLabel: '10 levels',
  },
  [A.MOONVINE_STREAM_COMPLETE]: {
    name: 'Moonvine Stream Complete',
    description: 'Clear every level in the Moonvine Stream biome.',
    category: 'campaign',
    progressLabel: '10 levels',
  },
  [A.ORACLE_BLOOM_COMPLETE]: {
    name: 'Oracle Bloom Complete',
    description: 'Clear every level in the Oracle Bloom Temple biome.',
    category: 'campaign',
    progressLabel: '10 levels',
  },
  [A.LOGIC_GARDEN_COMPLETE]: {
    name: 'Logic Garden Complete',
    description: 'Clear all 30 levels of Logic Garden.',
    category: 'campaign',
    progressLabel: '30 levels',
  },
  [A.STAR_COLLECTOR]: {
    name: 'Star Collector',
    description: 'Earn 30 stars in Logic Garden.',
    category: 'campaign',
    progressLabel: '30 stars',
  },
  [A.STAR_HARMONY]: {
    name: 'Star Harmony',
    description: 'Earn 60 stars in Logic Garden.',
    category: 'campaign',
    progressLabel: '60 stars',
  },
  [A.PERFECT_CONSTELLATION]: {
    name: 'Perfect Constellation',
    description: 'Earn all 90 stars in Logic Garden.',
    category: 'campaign',
    progressLabel: '90 stars',
  },
  [A.CROWNED_LOGIC]: {
    name: 'Crowned Logic',
    description: 'Earn 10 crowns.',
    category: 'campaign',
    progressLabel: '10 crowns',
  },
  [A.CROWN_GARDEN]: {
    name: 'Crown Garden',
    description: 'Earn all 30 crowns.',
    category: 'campaign',
    progressLabel: '30 crowns',
  },
  [A.LIGHTNING_SOLVE]: {
    name: 'Lightning Solve',
    description: 'Clear a 3-Minute Sprint puzzle.',
    category: 'sprint',
  },
  [A.PERFECT_SPRINT]: {
    name: 'Perfect Sprint',
    description: 'Clear a Sprint with no mistakes and no hints.',
    category: 'sprint',
  },
  [A.FIRST_DUEL]: {
    name: 'First Duel',
    description: 'Finish your first online duel.',
    category: 'duels',
  },
  [A.LOGIC_RIVAL]: {
    name: 'Logic Rival',
    description: 'Win your first online duel.',
    category: 'duels',
  },
  [A.PERFECT_RIVALRY]: {
    name: 'Perfect Rivalry',
    description: 'Win a duel with a crown / perfect solve.',
    category: 'duels',
  },
  [A.FRIENDLY_CHALLENGE]: {
    name: 'Friendly Challenge',
    description: 'Send a challenge to a friend.',
    category: 'social',
  },
  [A.PERFECT_HARMONY]: {
    name: 'Perfect Harmony',
    description: 'Complete three or more regions in a single placement.',
    category: 'skill',
  },
  [A.NO_HINTS_NEEDED]: {
    name: 'No Hints Needed',
    description: 'Clear any level without using hints.',
    category: 'skill',
  },
  [A.TAKE_A_BREATH]: {
    name: 'Take a Breath',
    description: 'Pause mid-puzzle and finish the level when you return.',
    category: 'mindfulness',
  },
  // ── World 2 — Astral Nexus ──
  [A.ASTRAL_NEXUS_UNLOCKED]: {
    name: 'Astral Nexus Unlocked',
    description: 'Cross the threshold into the Astral Nexus.',
    category: 'nexus',
  },
  [A.ASTRAL_NEXUS_COMPLETE]: {
    name: 'Astral Nexus Complete',
    description: 'Clear all 30 levels of the Astral Nexus.',
    category: 'nexus',
    progressLabel: '30 levels',
  },
  [A.ASTRAL_CORE_PERFECT]: {
    name: 'Astral Core Perfect',
    description: 'Crown the Astral Core — the final level.',
    category: 'nexus',
  },
};

export const CATEGORY_LABELS: Readonly<Record<AchievementCategory, string>> = {
  campaign: 'Campaign',
  nexus: 'Astral Nexus',
  sprint: 'Sprint',
  duels: 'Duels',
  social: 'Social',
  skill: 'Skill',
  mindfulness: 'Mindfulness',
};

/** Ordered list used by the gallery; campaign first, mindfulness last. */
export const CATEGORY_ORDER: readonly AchievementCategory[] = [
  'campaign',
  'nexus',
  'sprint',
  'duels',
  'social',
  'skill',
  'mindfulness',
];
