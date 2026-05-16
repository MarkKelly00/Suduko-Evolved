/**
 * Achievement tier derivation + brand-anchored tier colour tokens.
 *
 * Tiers are derived from the achievement's point value (the canonical
 * App Store Connect contract in `gameCenterIds.ts`), not from a separate
 * column — so the tier always reflects the player-visible point weight.
 *
 *   10–20 pts  → bronze
 *   25 pts     → silver
 *   50–75 pts  → gold
 *   100 pts    → obsidian
 *
 * Tier colours are pulled from the SudokuEvolved brand palette so the
 * icons sit cohesively next to the rest of the UI:
 *   - bronze   — warm copper-amber (seedling tier)
 *   - silver   — moonvine platinum with a cyan undertone (matches Moonvine
 *                biome + the app's accentTeal)
 *   - gold     — brand gold (#E0B96A — the dominant brand colour)
 *   - obsidian — deep navy with brand-gold inlay + bloom-green halo (apex)
 *
 * Pure module — no React, no MMKV, no Supabase. Safe to import from any
 * layer including tests.
 */

import {
  ACHIEVEMENT_POINTS,
  type GameCenterAchievementId,
} from '@/services/gameCenter';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'obsidian';

/** Map an achievement ID to its tier via its point value. */
export function getAchievementTier(id: GameCenterAchievementId): AchievementTier {
  const points = ACHIEVEMENT_POINTS[id];
  if (points <= 20) return 'bronze';
  if (points <= 25) return 'silver';
  if (points <= 75) return 'gold';
  return 'obsidian';
}

/**
 * Tier visual tokens. The icon PNGs already bake in the metal finish — these
 * tokens drive the surrounding chrome: card border ring, points-badge fill,
 * fallback placeholder colour when the PNG is missing.
 *
 * `primary` — the headline glyph / ring colour.
 * `shadow`  — the deeper companion used for the badge-fill base.
 * `halo`    — a low-opacity glow tint, applied as a `shadowColor` on iOS.
 * `label`   — short user-facing tier name for accessibility.
 */
export const TIER_COLORS: Record<
  AchievementTier,
  { primary: string; shadow: string; halo: string; label: string }
> = {
  bronze: {
    primary: '#A85B2A',
    shadow: '#8A4A22',
    halo: 'rgba(168, 91, 42, 0.35)',
    label: 'Bronze',
  },
  silver: {
    // Moonvine platinum — slightly cool, pairs with the app's accentTeal.
    primary: '#C8D4D6',
    shadow: '#7B8A8E',
    halo: 'rgba(94, 231, 196, 0.30)',
    label: 'Silver',
  },
  gold: {
    // Brand gold (#E0B96A) — anchors the dominant tier in the brand colour.
    primary: '#E0B96A',
    shadow: '#9C7E40',
    halo: 'rgba(224, 185, 106, 0.40)',
    label: 'Gold',
  },
  obsidian: {
    // Apex tier: brand-gold inlay on near-black, with a bloom-green halo
    // matching the success colour.
    primary: '#E0B96A',
    shadow: '#0B1220',
    halo: 'rgba(88, 242, 182, 0.30)',
    label: 'Obsidian',
  },
};
