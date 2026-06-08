/**
 * Single source of truth for the World 2 (Astral Nexus) saga-map geometry.
 *
 * Mirrors `mapLayout.ts` (World 1) but for the cosmic world. Node `level`
 * values are GLOBAL (31–60) so the same predicates the rest of the map uses
 * (`isCompleted(level)`, etc.) resolve straight to `world2-level-N` ids and the
 * pure `mapMath` helpers work unchanged. `y` is LOCAL to this world (starts at
 * 280); `worldRegistry` adds the portal-gap origin to place World 2 below
 * World 1 in the combined scroll space.
 *
 * Design vs World 1:
 *   • Wider horizontal swing ([0.18, 0.82] vs [0.22, 0.78]) so the cosmic
 *     causeway feels more expansive.
 *   • Bigger gaps at act boundaries (40→41, 50→51) for intentional negative
 *     space — "a new region", not a continuation of the same rail.
 *   • Landmarks cluster the path: Nexus Gate (31, world start), Prism Bridge
 *     (35), Meridian Orrery (40), Starfall Archive (45), Parallax Sanctum (50),
 *     Logic Astrolabe (55), Astral Core (60, finale).
 */

import type { MapNodeLayout, WorldAct } from './mapLayout';

/** 30-node weaving path through the Astral Nexus. Hand-tuned. */
export const WORLD_2_NODE_LAYOUT: MapNodeLayout[] = [
  // ── Act IV · Prism Causeway (31–40) — crystalline, luminous, precise ──
  { level: 31, x: 0.50, y: 280,  biome: 'prism-causeway', landmark: 'Nexus Gate' },
  { level: 32, x: 0.64, y: 560,  biome: 'prism-causeway' },
  { level: 33, x: 0.80, y: 850,  biome: 'prism-causeway' },
  { level: 34, x: 0.64, y: 1140, biome: 'prism-causeway' },
  { level: 35, x: 0.48, y: 1430, biome: 'prism-causeway', landmark: 'Prism Bridge' },
  { level: 36, x: 0.30, y: 1720, biome: 'prism-causeway' },
  { level: 37, x: 0.20, y: 2010, biome: 'prism-causeway' },
  { level: 38, x: 0.34, y: 2300, biome: 'prism-causeway' },
  { level: 39, x: 0.52, y: 2590, biome: 'prism-causeway' },
  { level: 40, x: 0.50, y: 2880, biome: 'prism-causeway', landmark: 'Meridian Orrery' },
  // ── Act V · Starfall Archive (41–50) — archival, celestial, mysterious ──
  { level: 41, x: 0.66, y: 3190, biome: 'star-archive' },
  { level: 42, x: 0.80, y: 3480, biome: 'star-archive' },
  { level: 43, x: 0.66, y: 3770, biome: 'star-archive' },
  { level: 44, x: 0.48, y: 4060, biome: 'star-archive' },
  { level: 45, x: 0.50, y: 4350, biome: 'star-archive', landmark: 'Starfall Archive' },
  { level: 46, x: 0.32, y: 4640, biome: 'star-archive' },
  { level: 47, x: 0.22, y: 4930, biome: 'star-archive' },
  { level: 48, x: 0.36, y: 5220, biome: 'star-archive' },
  { level: 49, x: 0.54, y: 5510, biome: 'star-archive' },
  { level: 50, x: 0.50, y: 5800, biome: 'star-archive', landmark: 'Parallax Sanctum' },
  // ── Act VI · Celestial Engine (51–60) — climactic, sacred, mechanical ──
  { level: 51, x: 0.66, y: 6110, biome: 'celestial-engine' },
  { level: 52, x: 0.80, y: 6400, biome: 'celestial-engine' },
  { level: 53, x: 0.66, y: 6690, biome: 'celestial-engine' },
  { level: 54, x: 0.48, y: 6980, biome: 'celestial-engine' },
  { level: 55, x: 0.50, y: 7270, biome: 'celestial-engine', landmark: 'Logic Astrolabe' },
  { level: 56, x: 0.32, y: 7560, biome: 'celestial-engine' },
  { level: 57, x: 0.22, y: 7850, biome: 'celestial-engine' },
  { level: 58, x: 0.40, y: 8140, biome: 'celestial-engine' },
  { level: 59, x: 0.60, y: 8430, biome: 'celestial-engine' },
  { level: 60, x: 0.50, y: 8740, biome: 'celestial-engine', landmark: 'Astral Core' },
];

/** Local content height World 2 needs (last node y + breathing room). */
export const WORLD_2_BOTTOM_PADDING = 360;
export const WORLD_2_LOCAL_HEIGHT =
  WORLD_2_NODE_LAYOUT[WORLD_2_NODE_LAYOUT.length - 1]!.y + WORLD_2_BOTTOM_PADDING;

/**
 * Three acts for Astral Nexus. `fromLevel`/`toLevel` are GLOBAL indices.
 * Palette per the brief: Prism Causeway (blue→violet), Starfall Archive
 * (violet→blue), Celestial Engine (gold→teal climax).
 */
export const WORLD_2_ACTS: WorldAct[] = [
  {
    id: 'prism-causeway',
    title: 'Prism Causeway',
    fromLevel: 31,
    toLevel: 40,
    intensity: 0.8,
    primary: '#7BA7F2',
    accent: '#9D7BFF',
    wash: 'rgba(123, 167, 242, 0.12)',
  },
  {
    id: 'starfall-archive',
    title: 'Starfall Archive',
    fromLevel: 41,
    toLevel: 50,
    intensity: 0.9,
    primary: '#9D7BFF',
    accent: '#7BA7F2',
    wash: 'rgba(157, 123, 255, 0.12)',
  },
  {
    id: 'celestial-engine',
    title: 'Celestial Engine',
    fromLevel: 51,
    toLevel: 60,
    intensity: 1,
    primary: '#E0B96A',
    accent: '#5EE7C4',
    wash: 'rgba(224, 185, 106, 0.12)',
  },
];

/** Act containing a global level 31–60. Falls back to the first act. */
export function getWorld2ActForLevel(level: number): WorldAct {
  return (
    WORLD_2_ACTS.find((a) => level >= a.fromLevel && level <= a.toLevel) ??
    WORLD_2_ACTS[0]!
  );
}

/** True iff `level` is the final level of its Astral Nexus act (40/50/60). */
export function isWorld2ActFinaleLevel(level: number): boolean {
  return WORLD_2_ACTS.some((a) => a.toLevel === level);
}

export function getWorld2NodeLayoutForLevel(level: number): MapNodeLayout | null {
  return WORLD_2_NODE_LAYOUT.find((n) => n.level === level) ?? null;
}
