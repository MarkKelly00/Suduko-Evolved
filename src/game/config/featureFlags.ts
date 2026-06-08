/**
 * Compile-time feature flags for the Saga Atlas expansion.
 *
 * These gate World 2 (Astral Nexus) so it can be disabled wholesale without
 * touching World 1. Flipping `enableAstralNexus` to `false` makes the saga map,
 * the unlock chain, the level registry, and the preview modal all behave
 * exactly as they did when only World 1 existed — a clean, no-data-loss
 * rollback. They are plain constants (inlined + tree-shaken at build) rather
 * than a remote config service; if a remote/AB system is wanted later it can
 * back the same `featureFlags` object and `isWorldEnabled()` helper without
 * changing any call site.
 */

export interface FeatureFlags {
  /** Master switch for World 2: registry inclusion, unlock crossing (30→31),
   *  map rendering, and preview/leaderboard wiring. */
  enableAstralNexus: boolean;
  /** When false, the World 2 unlock portal renders as a static locked/unlocked
   *  card instead of the animated energize sequence (independent of the global
   *  reduced-motion accessibility setting, which always wins). */
  enableWorld2PortalAnimation: boolean;
  /** When false, no rival markers (friend-beat glint / crown aura) are drawn on
   *  map nodes. Preview-modal score data is unaffected either way. */
  enableMapRivalMarkers: boolean;
}

export const featureFlags: FeatureFlags = {
  enableAstralNexus: true,
  enableWorld2PortalAnimation: true,
  enableMapRivalMarkers: true,
};

/** Worlds always available regardless of flags. */
const ALWAYS_ENABLED_WORLD_IDS = new Set<string>(['world1']);

/**
 * Is a world enabled for rendering / progression? World 1 is always on.
 * World 2 follows `enableAstralNexus`. Unknown worlds default to off.
 */
export function isWorldEnabled(worldId: string): boolean {
  if (ALWAYS_ENABLED_WORLD_IDS.has(worldId)) return true;
  if (worldId === 'world2') return featureFlags.enableAstralNexus;
  return false;
}

/**
 * Hook form for components. Flags are static today, so this just returns the
 * stable singleton — but using the hook keeps call sites ready for a future
 * reactive/remote flag source.
 */
export function useFeatureFlags(): FeatureFlags {
  return featureFlags;
}
