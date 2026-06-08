/**
 * Static map from short achievement ID → bundled PNG asset.
 *
 * Metro bundler requires `require()` paths to be statically analyzable
 * (no template literals, no dynamic indices), so this file is a one-time
 * block of explicit `require()` calls — one per achievement.
 *
 * Today the map is empty: the 20 PNGs haven't been generated + sliced
 * yet. `<AchievementGlyph>` gracefully renders the tier-coloured fallback
 * placeholder for any short ID missing from this map, so the gallery
 * and unlock toast already work without the art.
 *
 * To wire in the icons after running Phase A (Grok Imagine) + Phase B
 * (slicer): uncomment the matching lines below. Re-running the slicer is
 * idempotent — it overwrites the PNGs from the manifest deterministically.
 *
 * The short ID convention matches `scripts/achievement-icon-grid.json` and
 * `assets/achievements/{id}.png`. The full Game Center IDs (with the
 * `com.sudokuevolved.achievement.` prefix) stay confined to the GC contract
 * in `src/services/gameCenter/gameCenterIds.ts`.
 */

import type { ImageSourcePropType } from 'react-native';

import {
  ALL_ACHIEVEMENT_IDS,
  GAME_CENTER_ACHIEVEMENTS,
  type GameCenterAchievementId,
} from '@/services/gameCenter';

/** Strip the `com.sudokuevolved.achievement.` prefix → short id. */
export function shortIdFor(id: GameCenterAchievementId): string {
  const prefix = 'com.sudokuevolved.achievement.';
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

/**
 * Short-id → bundled PNG. Each `require()` is statically resolvable so
 * Metro can bundle the asset. Once the 20 PNGs are dropped into
 * `assets/achievements/` via the slicer, uncomment the lines below.
 */
export const ACHIEVEMENT_ASSETS: Partial<Record<string, ImageSourcePropType>> = {
  first_bloom: require('../../../assets/achievements/first_bloom.png'),
  perfect_bloom: require('../../../assets/achievements/perfect_bloom.png'),
  seed_grove_complete: require('../../../assets/achievements/seed_grove_complete.png'),
  moonvine_stream_complete: require('../../../assets/achievements/moonvine_stream_complete.png'),
  oracle_bloom_complete: require('../../../assets/achievements/oracle_bloom_complete.png'),
  logic_garden_complete: require('../../../assets/achievements/logic_garden_complete.png'),
  star_collector: require('../../../assets/achievements/star_collector.png'),
  star_harmony: require('../../../assets/achievements/star_harmony.png'),
  perfect_constellation: require('../../../assets/achievements/perfect_constellation.png'),
  crowned_logic: require('../../../assets/achievements/crowned_logic.png'),
  crown_garden: require('../../../assets/achievements/crown_garden.png'),
  perfect_harmony: require('../../../assets/achievements/perfect_harmony.png'),
  lightning_solve: require('../../../assets/achievements/lightning_solve.png'),
  perfect_sprint: require('../../../assets/achievements/perfect_sprint.png'),
  first_duel: require('../../../assets/achievements/first_duel.png'),
  logic_rival: require('../../../assets/achievements/logic_rival.png'),
  perfect_rivalry: require('../../../assets/achievements/perfect_rivalry.png'),
  friendly_challenge: require('../../../assets/achievements/friendly_challenge.png'),
  no_hints_needed: require('../../../assets/achievements/no_hints_needed.png'),
  take_a_breath: require('../../../assets/achievements/take_a_breath.png'),
  // ── World 2 — Astral Nexus ──
  astral_nexus_unlocked: require('../../../assets/achievements/astral_nexus_unlocked.png'),
  astral_nexus_complete: require('../../../assets/achievements/astral_nexus_complete.png'),
  astral_core_perfect: require('../../../assets/achievements/astral_core_perfect.png'),
};

/** Look up the bundled asset for an achievement, or `null` if missing. */
export function getAchievementAsset(
  id: GameCenterAchievementId,
): ImageSourcePropType | null {
  return ACHIEVEMENT_ASSETS[shortIdFor(id)] ?? null;
}

/** True if every declared achievement has a bundled PNG. Helpful for a
 *  future CI guard. */
export function allAssetsBundled(): boolean {
  return ALL_ACHIEVEMENT_IDS.every(
    (id) => ACHIEVEMENT_ASSETS[shortIdFor(id)] != null,
  );
}

// Force tree-shaker to keep the constant reference even if all 20 lines
// stay commented out — also gives us a single touch-point that a future
// PR can grep when generating the require block.
void GAME_CENTER_ACHIEVEMENTS;
