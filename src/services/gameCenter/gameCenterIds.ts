/**
 * Frozen Game Center identifier constants.
 *
 * These IDs are the contract with App Store Connect — every leaderboard
 * and achievement that the app submits to MUST be created in App Store
 * Connect with the exact ID below (case-sensitive). Changing any of
 * these strings breaks all in-flight submissions for existing players,
 * so treat this file as append-only:
 *
 *   - Adding a new leaderboard / achievement: fine, just add a new key.
 *   - Renaming an existing one: never. Create a new ID, deprecate the
 *     old one in App Store Connect, leave the old constant in place
 *     until all clients have rolled forward.
 *
 * The reference names + sort orders + point values are documented in
 * `docs/GAME_CENTER_SETUP.md` for the App Store Connect setup pass.
 */

export const GAME_CENTER_LEADERBOARDS = {
  /** 3-Minute Sprint score. Sort: high → low. Format: integer. */
  SPRINT_3MIN_SCORE:
    'com.sudokuevolved.leaderboard.sprint_3min_score',
  /** Sprint clear time in milliseconds. Sort: low → high.
   *  Format: "Elapsed Time - To Hundredths". */
  SPRINT_FASTEST_CLEAR:
    'com.sudokuevolved.leaderboard.sprint_fastest_clear',
  /** Cumulative duel wins. Sort: high → low. Format: integer. */
  DUEL_WINS:
    'com.sudokuevolved.leaderboard.duel_wins',
  /** Best score from any single online duel. Sort: high → low. */
  DUEL_BEST_SCORE:
    'com.sudokuevolved.leaderboard.duel_best_score',
  /** World 1 total stars. Max 90 (3★ × 30 levels). Sort: high → low. */
  LOGIC_GARDEN_STARS:
    'com.sudokuevolved.leaderboard.logic_garden_stars',
  /** World 1 total crowns. Max 30 (1 per level). Sort: high → low. */
  LOGIC_GARDEN_CROWNS:
    'com.sudokuevolved.leaderboard.logic_garden_crowns',
  /** World 2 (Astral Nexus) total stars. Max 90 (3★ × 30 levels).
   *  Sort: high → low. NOT yet created in App Store Connect — kept out of
   *  `REGISTERED_LEADERBOARD_IDS` so no submission is sent until it exists. */
  ASTRAL_NEXUS_STARS:
    'com.sudokuevolved.leaderboard.astral_nexus_stars',
  /** World 2 (Astral Nexus) total crowns. Max 30. Sort: high → low.
   *  NOT yet created in App Store Connect (see note above). */
  ASTRAL_NEXUS_CROWNS:
    'com.sudokuevolved.leaderboard.astral_nexus_crowns',
} as const;

export type GameCenterLeaderboardId =
  (typeof GAME_CENTER_LEADERBOARDS)[keyof typeof GAME_CENTER_LEADERBOARDS];

export const ALL_LEADERBOARD_IDS: readonly GameCenterLeaderboardId[] =
  Object.values(GAME_CENTER_LEADERBOARDS);

export const GAME_CENTER_ACHIEVEMENTS = {
  // ── Campaign — single-event ──
  /** Clear first campaign level. 10 pts. */
  FIRST_BLOOM:
    'com.sudokuevolved.achievement.first_bloom',
  /** Earn first crown. 20 pts. */
  PERFECT_BLOOM:
    'com.sudokuevolved.achievement.perfect_bloom',
  /** Clear levels 1–10. 25 pts. */
  SEED_GROVE_COMPLETE:
    'com.sudokuevolved.achievement.seed_grove_complete',
  /** Clear levels 11–20. 25 pts. */
  MOONVINE_STREAM_COMPLETE:
    'com.sudokuevolved.achievement.moonvine_stream_complete',
  /** Clear levels 21–30. 50 pts. */
  ORACLE_BLOOM_COMPLETE:
    'com.sudokuevolved.achievement.oracle_bloom_complete',
  /** Clear all 30 levels. 75 pts. */
  LOGIC_GARDEN_COMPLETE:
    'com.sudokuevolved.achievement.logic_garden_complete',

  // ── Campaign — count-triggered (percent progresses with stat) ──
  /** Earn 30 stars. 25 pts. */
  STAR_COLLECTOR:
    'com.sudokuevolved.achievement.star_collector',
  /** Earn 60 stars. 50 pts. */
  STAR_HARMONY:
    'com.sudokuevolved.achievement.star_harmony',
  /** Earn all 90 stars. 100 pts. */
  PERFECT_CONSTELLATION:
    'com.sudokuevolved.achievement.perfect_constellation',
  /** Earn 10 crowns. 50 pts. */
  CROWNED_LOGIC:
    'com.sudokuevolved.achievement.crowned_logic',
  /** Earn all 30 crowns. 100 pts. */
  CROWN_GARDEN:
    'com.sudokuevolved.achievement.crown_garden',

  // ── Sprint ──
  /** Clear a Sprint puzzle. 25 pts. */
  LIGHTNING_SOLVE:
    'com.sudokuevolved.achievement.lightning_solve',
  /** Sprint clear with 0 mistakes and 0 hints. 50 pts. */
  PERFECT_SPRINT:
    'com.sudokuevolved.achievement.perfect_sprint',

  // ── Duels ──
  /** Complete first online duel. 10 pts. */
  FIRST_DUEL:
    'com.sudokuevolved.achievement.first_duel',
  /** Win first online duel. 25 pts. */
  LOGIC_RIVAL:
    'com.sudokuevolved.achievement.logic_rival',
  /** Win a duel with a crown / perfect solve. 50 pts. */
  PERFECT_RIVALRY:
    'com.sudokuevolved.achievement.perfect_rivalry',
  /** Challenge a friend (any mode). 25 pts. */
  FRIENDLY_CHALLENGE:
    'com.sudokuevolved.achievement.friendly_challenge',

  // ── Skill / streak ──
  /** Trigger a 3+ region completion event in a single solve. 50 pts. */
  PERFECT_HARMONY:
    'com.sudokuevolved.achievement.perfect_harmony',
  /** Clear any level with no hints. 25 pts. */
  NO_HINTS_NEEDED:
    'com.sudokuevolved.achievement.no_hints_needed',
  /** Pause/resume and complete a level. 10 pts. */
  TAKE_A_BREATH:
    'com.sudokuevolved.achievement.take_a_breath',

  // ── World 2 — Astral Nexus ──
  /** Cross the threshold into the Astral Nexus (reach World 2). 20 pts. */
  ASTRAL_NEXUS_UNLOCKED:
    'com.sudokuevolved.achievement.astral_nexus_unlocked',
  /** Clear all 30 Astral Nexus levels (31–60). 40 pts. */
  ASTRAL_NEXUS_COMPLETE:
    'com.sudokuevolved.achievement.astral_nexus_complete',
  /** Crown the Astral Core — the final level (60). 50 pts. */
  ASTRAL_CORE_PERFECT:
    'com.sudokuevolved.achievement.astral_core_perfect',
} as const;

export type GameCenterAchievementId =
  (typeof GAME_CENTER_ACHIEVEMENTS)[keyof typeof GAME_CENTER_ACHIEVEMENTS];

export const ALL_ACHIEVEMENT_IDS: readonly GameCenterAchievementId[] =
  Object.values(GAME_CENTER_ACHIEVEMENTS);

/**
 * Point values per achievement. Exported separately so tests can verify
 * the App Store Connect total matches the spec — sum must be 910 (World 1's
 * 800 + Astral Nexus's 110). Apple caps an app at 1000 total points, so this
 * leaves 90 of headroom for future worlds.
 */
export const ACHIEVEMENT_POINTS: Readonly<
  Record<GameCenterAchievementId, number>
> = {
  [GAME_CENTER_ACHIEVEMENTS.FIRST_BLOOM]: 10,
  [GAME_CENTER_ACHIEVEMENTS.PERFECT_BLOOM]: 20,
  [GAME_CENTER_ACHIEVEMENTS.SEED_GROVE_COMPLETE]: 25,
  [GAME_CENTER_ACHIEVEMENTS.MOONVINE_STREAM_COMPLETE]: 25,
  [GAME_CENTER_ACHIEVEMENTS.ORACLE_BLOOM_COMPLETE]: 50,
  [GAME_CENTER_ACHIEVEMENTS.LOGIC_GARDEN_COMPLETE]: 75,
  [GAME_CENTER_ACHIEVEMENTS.STAR_COLLECTOR]: 25,
  [GAME_CENTER_ACHIEVEMENTS.STAR_HARMONY]: 50,
  [GAME_CENTER_ACHIEVEMENTS.PERFECT_CONSTELLATION]: 100,
  [GAME_CENTER_ACHIEVEMENTS.CROWNED_LOGIC]: 50,
  [GAME_CENTER_ACHIEVEMENTS.CROWN_GARDEN]: 100,
  [GAME_CENTER_ACHIEVEMENTS.LIGHTNING_SOLVE]: 25,
  [GAME_CENTER_ACHIEVEMENTS.PERFECT_SPRINT]: 50,
  [GAME_CENTER_ACHIEVEMENTS.FIRST_DUEL]: 10,
  [GAME_CENTER_ACHIEVEMENTS.LOGIC_RIVAL]: 25,
  [GAME_CENTER_ACHIEVEMENTS.PERFECT_RIVALRY]: 50,
  [GAME_CENTER_ACHIEVEMENTS.FRIENDLY_CHALLENGE]: 25,
  [GAME_CENTER_ACHIEVEMENTS.PERFECT_HARMONY]: 50,
  [GAME_CENTER_ACHIEVEMENTS.NO_HINTS_NEEDED]: 25,
  [GAME_CENTER_ACHIEVEMENTS.TAKE_A_BREATH]: 10,
  // World 2 — Astral Nexus (110 total).
  [GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_UNLOCKED]: 20,
  [GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_COMPLETE]: 40,
  [GAME_CENTER_ACHIEVEMENTS.ASTRAL_CORE_PERFECT]: 50,
};

/**
 * IDs that have actually been created in App Store Connect and are therefore
 * safe to submit to. The Game Center service short-circuits (no submit, no
 * enqueue) for any id NOT in these sets — so World 2 leaderboard/achievement
 * reporting is fully wired in code but stays inert until the operator creates
 * the IDs in ASC and adds them here. (See `docs/GAME_CENTER_SETUP.md`.)
 *
 * To go live with Astral Nexus Game Center: create the 2 leaderboards + 3
 * achievements in ASC with the exact ids above, then move them from the
 * "pending" comments below into these sets.
 */
export const REGISTERED_LEADERBOARD_IDS: ReadonlySet<string> = new Set<string>([
  GAME_CENTER_LEADERBOARDS.SPRINT_3MIN_SCORE,
  GAME_CENTER_LEADERBOARDS.SPRINT_FASTEST_CLEAR,
  GAME_CENTER_LEADERBOARDS.DUEL_WINS,
  GAME_CENTER_LEADERBOARDS.DUEL_BEST_SCORE,
  GAME_CENTER_LEADERBOARDS.LOGIC_GARDEN_STARS,
  GAME_CENTER_LEADERBOARDS.LOGIC_GARDEN_CROWNS,
  // Pending ASC creation:
  // GAME_CENTER_LEADERBOARDS.ASTRAL_NEXUS_STARS,
  // GAME_CENTER_LEADERBOARDS.ASTRAL_NEXUS_CROWNS,
]);

export const REGISTERED_ACHIEVEMENT_IDS: ReadonlySet<string> = new Set<string>([
  GAME_CENTER_ACHIEVEMENTS.FIRST_BLOOM,
  GAME_CENTER_ACHIEVEMENTS.PERFECT_BLOOM,
  GAME_CENTER_ACHIEVEMENTS.SEED_GROVE_COMPLETE,
  GAME_CENTER_ACHIEVEMENTS.MOONVINE_STREAM_COMPLETE,
  GAME_CENTER_ACHIEVEMENTS.ORACLE_BLOOM_COMPLETE,
  GAME_CENTER_ACHIEVEMENTS.LOGIC_GARDEN_COMPLETE,
  GAME_CENTER_ACHIEVEMENTS.STAR_COLLECTOR,
  GAME_CENTER_ACHIEVEMENTS.STAR_HARMONY,
  GAME_CENTER_ACHIEVEMENTS.PERFECT_CONSTELLATION,
  GAME_CENTER_ACHIEVEMENTS.CROWNED_LOGIC,
  GAME_CENTER_ACHIEVEMENTS.CROWN_GARDEN,
  GAME_CENTER_ACHIEVEMENTS.LIGHTNING_SOLVE,
  GAME_CENTER_ACHIEVEMENTS.PERFECT_SPRINT,
  GAME_CENTER_ACHIEVEMENTS.FIRST_DUEL,
  GAME_CENTER_ACHIEVEMENTS.LOGIC_RIVAL,
  GAME_CENTER_ACHIEVEMENTS.PERFECT_RIVALRY,
  GAME_CENTER_ACHIEVEMENTS.FRIENDLY_CHALLENGE,
  GAME_CENTER_ACHIEVEMENTS.PERFECT_HARMONY,
  GAME_CENTER_ACHIEVEMENTS.NO_HINTS_NEEDED,
  GAME_CENTER_ACHIEVEMENTS.TAKE_A_BREATH,
  // Pending ASC creation:
  // GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_UNLOCKED,
  // GAME_CENTER_ACHIEVEMENTS.ASTRAL_NEXUS_COMPLETE,
  // GAME_CENTER_ACHIEVEMENTS.ASTRAL_CORE_PERFECT,
]);

/** True iff the leaderboard id has been created in App Store Connect. */
export function isLeaderboardRegistered(id: string): boolean {
  return REGISTERED_LEADERBOARD_IDS.has(id);
}

/** True iff the achievement id has been created in App Store Connect. */
export function isAchievementRegistered(id: string): boolean {
  return REGISTERED_ACHIEVEMENT_IDS.has(id);
}
