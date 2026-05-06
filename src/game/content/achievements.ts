/**
 * Phase 3 placeholder. Phase 6+ will populate this with full achievement
 * definitions, unlock predicates, and Game Center reporting hooks.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Total progress required to unlock (e.g. number of clean clears). */
  goal: number;
}

export const ACHIEVEMENTS: Achievement[] = [];
