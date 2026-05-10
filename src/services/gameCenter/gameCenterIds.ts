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
} as const;

export type GameCenterAchievementId =
  (typeof GAME_CENTER_ACHIEVEMENTS)[keyof typeof GAME_CENTER_ACHIEVEMENTS];

export const ALL_ACHIEVEMENT_IDS: readonly GameCenterAchievementId[] =
  Object.values(GAME_CENTER_ACHIEVEMENTS);

/**
 * Point values per achievement. Exported separately so tests can verify
 * the App Store Connect total matches the spec — sum must be 910.
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
};
