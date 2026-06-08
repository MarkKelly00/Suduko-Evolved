export interface World {
  id: string;
  name: string;
  /** Short tagline shown under the world title on the map. */
  tagline: string;
  /** Hex color used for ambient theming on this world's map. */
  themeColor: string;
  levelCount: number;
}

export const WORLD_1: World = {
  id: 'world1',
  name: 'Logic Garden',
  tagline: 'Where reason blooms.',
  themeColor: '#5BD6A8',
  levelCount: 30,
};

/**
 * World 2 — Astral Nexus (levels 31–60). The second saga world: cosmic logic,
 * constellations, prism bridges. Unlocks when Logic Garden's level 30 is
 * cleared (see `worldUnlockRules.ts`). Its 30 levels carry the GLOBAL indices
 * 31–60 so every level id (`world2-level-31` … `world2-level-60`) stays
 * globally unique and Supabase `level_id` rows need no schema change.
 */
export const WORLD_2: World = {
  id: 'world2',
  name: 'Astral Nexus',
  tagline: 'Where patterns become constellations.',
  themeColor: '#9D7BFF',
  levelCount: 30,
};

export const WORLDS: World[] = [WORLD_1, WORLD_2];
