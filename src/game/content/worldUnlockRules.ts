/**
 * World unlock rules — the single source of truth for "is a world open?".
 *
 * Kept dependency-light (no store, no UI, no persistence imports) so both the
 * progress schema/migration and the saga map can consume it without circular
 * imports. Unlock state is always DERIVED from completed levels here, so the
 * persisted `unlockedWorlds` array can be repaired on every migration / cloud
 * restore and can never silently desync from real progress.
 */

import { WORLD_1, WORLD_2 } from './worlds';
import { levelIdForGlobal } from './levels';

export interface WorldUnlockRequirement {
  type: 'complete_level' | 'stars' | 'crowns';
  /** Global level index (1–60) whose completion is required. */
  levelId?: number;
  /** Reserved for the future "60+ stars in World 1" rule — NOT enforced now. */
  starsRequired?: number;
  crownsRequired?: number;
}

/**
 * Requirement per world. `null` = always unlocked.
 * World 2 unlocks when the final World 1 level (global index 30) is completed,
 * per the current pass. The `stars`/`crowns` shape exists so a future
 * "require 60+ stars" gate can drop in without touching call sites.
 */
export const WORLD_UNLOCK_REQUIREMENTS: Record<string, WorldUnlockRequirement | null> = {
  [WORLD_1.id]: null,
  [WORLD_2.id]: { type: 'complete_level', levelId: WORLD_1.levelCount }, // level 30
};

/** The level id whose completion opens a world, or null if always-open. */
export function unlockGateLevelId(worldId: string): string | null {
  const req = WORLD_UNLOCK_REQUIREMENTS[worldId];
  if (!req || req.type !== 'complete_level' || req.levelId == null) return null;
  return levelIdForGlobal(req.levelId);
}

/** Is `worldId` unlocked given the set of completed level ids? */
export function isWorldUnlockedByProgress(
  worldId: string,
  completedLevelIds: readonly string[],
): boolean {
  const req = WORLD_UNLOCK_REQUIREMENTS[worldId];
  if (!req) return true; // always-on world (World 1)
  if (req.type === 'complete_level' && req.levelId != null) {
    return completedLevelIds.includes(levelIdForGlobal(req.levelId));
  }
  // stars / crowns requirements are reserved for the future and treated as
  // not-yet-met here (no enforcement this pass).
  return false;
}

/** Derive the full set of unlocked world ids from completed levels. */
export function deriveUnlockedWorlds(completedLevelIds: readonly string[]): string[] {
  const ids: string[] = [WORLD_1.id]; // always unlocked
  if (isWorldUnlockedByProgress(WORLD_2.id, completedLevelIds)) ids.push(WORLD_2.id);
  return ids;
}

/**
 * Union an existing `unlockedWorlds` array with what progress now implies, then
 * dedupe. Never removes a world (no regressions); only ever adds. Used by the
 * migration and the live progress writes to keep the persisted array correct.
 */
export function repairUnlockedWorlds(
  existing: readonly string[] | undefined,
  completedLevelIds: readonly string[],
): string[] {
  return Array.from(
    new Set([...(existing ?? [WORLD_1.id]), ...deriveUnlockedWorlds(completedLevelIds)]),
  );
}
