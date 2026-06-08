/**
 * Single source of truth for the World 1 saga map node geometry.
 *
 * Every visual layer — terrain blobs, the bezier path, vines, landmarks,
 * the level nodes themselves — derives its positions from this array.
 * That gives the map a cohesive feel: the path actually lands on every
 * node, vines curl off real path turns, terrain follows real clusters.
 *
 * Coordinates:
 *   - `x` is normalized to viewport width (0..1). Layers convert it to
 *     pixels at render time so the same layout works on every device.
 *     Stay within `[0.22, 0.78]` so nodes never crowd a screen edge.
 *   - `y` is the absolute vertical pixel offset inside the scroll
 *     content. Increase monotonically. The layout deliberately uses
 *     uneven gaps (240–340 px) so the world feels organic rather than
 *     ladder-like.
 *
 * Biomes name the visual region a node sits in. They drive accent
 * decisions in `GardenBackground` / `VineDecorations`. Six biomes cycle
 * through the world in clusters of roughly five so each chunk reads as
 * a different "scene" without changing what Sudoku puzzles are loaded.
 *
 * Landmarks anchor on the seven milestone levels (1, 5, 10, 15, 20, 25,
 * 30). `GardenLandmarks` owns the procedural drawing for each name.
 */

export type MapBiome =
  // World 1 — Logic Garden
  | 'seed-gate'
  | 'moon-vine'
  | 'crystal-bed'
  | 'logic-stream'
  | 'bloom-arch'
  | 'oracle-grove'
  // World 2 — Astral Nexus
  | 'prism-causeway'
  | 'star-archive'
  | 'celestial-engine';

export type MapLandmark =
  // World 1 — Logic Garden
  | 'Seed Gate'
  | 'Glass Sprout Bridge'
  | 'Crystal Logic Fountain'
  | 'Moonvine Crossing'
  | 'Golden Ratio Grove'
  | 'Oracle Bloom'
  | 'Logic Garden Temple'
  // World 2 — Astral Nexus
  | 'Nexus Gate'
  | 'Prism Bridge'
  | 'Meridian Orrery'
  | 'Starfall Archive'
  | 'Parallax Sanctum'
  | 'Logic Astrolabe'
  | 'Astral Core';

export interface MapNodeLayout {
  /** Level index, 1..30. Matches `WORLD_1_LEVELS[i].index`. */
  level: number;
  /** Horizontal position normalized to viewport width (0..1). */
  x: number;
  /** Absolute vertical pixel offset inside the scroll content. */
  y: number;
  biome: MapBiome;
  /** Landmark name when this node is a milestone, else undefined. */
  landmark?: MapLandmark;
}

/**
 * 30-node weaving path through the Logic Garden. Hand-tuned (not random)
 * so the curve feels intentional: gentle S-curves, with occasional
 * sharper turns near landmarks to give them visual emphasis.
 */
export const WORLD_1_NODE_LAYOUT: MapNodeLayout[] = [
  { level: 1,  x: 0.50, y: 280,  biome: 'seed-gate',    landmark: 'Seed Gate' },
  { level: 2,  x: 0.62, y: 540,  biome: 'seed-gate' },
  { level: 3,  x: 0.46, y: 800,  biome: 'seed-gate' },
  { level: 4,  x: 0.32, y: 1080, biome: 'moon-vine' },
  { level: 5,  x: 0.50, y: 1360, biome: 'moon-vine',    landmark: 'Glass Sprout Bridge' },
  { level: 6,  x: 0.66, y: 1640, biome: 'moon-vine' },
  { level: 7,  x: 0.74, y: 1920, biome: 'moon-vine' },
  { level: 8,  x: 0.58, y: 2200, biome: 'crystal-bed' },
  { level: 9,  x: 0.40, y: 2480, biome: 'crystal-bed' },
  { level: 10, x: 0.50, y: 2780, biome: 'crystal-bed',  landmark: 'Crystal Logic Fountain' },
  { level: 11, x: 0.66, y: 3060, biome: 'crystal-bed' },
  { level: 12, x: 0.76, y: 3340, biome: 'logic-stream' },
  { level: 13, x: 0.62, y: 3620, biome: 'logic-stream' },
  { level: 14, x: 0.42, y: 3900, biome: 'logic-stream' },
  { level: 15, x: 0.50, y: 4200, biome: 'logic-stream', landmark: 'Moonvine Crossing' },
  { level: 16, x: 0.34, y: 4500, biome: 'bloom-arch' },
  { level: 17, x: 0.24, y: 4780, biome: 'bloom-arch' },
  { level: 18, x: 0.36, y: 5060, biome: 'bloom-arch' },
  { level: 19, x: 0.54, y: 5340, biome: 'bloom-arch' },
  { level: 20, x: 0.50, y: 5640, biome: 'bloom-arch',   landmark: 'Golden Ratio Grove' },
  { level: 21, x: 0.66, y: 5920, biome: 'oracle-grove' },
  { level: 22, x: 0.78, y: 6200, biome: 'oracle-grove' },
  { level: 23, x: 0.62, y: 6480, biome: 'oracle-grove' },
  { level: 24, x: 0.42, y: 6760, biome: 'oracle-grove' },
  { level: 25, x: 0.50, y: 7060, biome: 'oracle-grove', landmark: 'Oracle Bloom' },
  { level: 26, x: 0.34, y: 7340, biome: 'oracle-grove' },
  { level: 27, x: 0.26, y: 7620, biome: 'oracle-grove' },
  { level: 28, x: 0.40, y: 7900, biome: 'oracle-grove' },
  { level: 29, x: 0.58, y: 8200, biome: 'oracle-grove' },
  { level: 30, x: 0.50, y: 8540, biome: 'oracle-grove', landmark: 'Logic Garden Temple' },
];

/** Pixel padding above the first node, leaves room for the world header. */
export const MAP_TOP_PADDING = 80;
/** Pixel padding below the last node so the temple has breathing room. */
export const MAP_BOTTOM_PADDING = 320;
/** Total scroll content height the world stage needs to cover. */
export const MAP_CONTENT_HEIGHT =
  WORLD_1_NODE_LAYOUT[WORLD_1_NODE_LAYOUT.length - 1]!.y +
  MAP_BOTTOM_PADDING;

export function getLandmarkLevels(): MapNodeLayout[] {
  return WORLD_1_NODE_LAYOUT.filter((n) => n.landmark != null);
}

export function getNodeLayoutForLevel(level: number): MapNodeLayout | null {
  return WORLD_1_NODE_LAYOUT.find((n) => n.level === level) ?? null;
}

// ---------------------------------------------------------------------------
// World "acts" — every 10 levels become a distinct visual chapter.
// ---------------------------------------------------------------------------
//
// Acts are a presentation-only concept layered on top of biomes/landmarks.
// Render layers (terrain, path, vines, landmarks) consult the act metadata
// to pick palette accents + intensity multipliers so each 10-level stretch
// reads as a different "place" in Logic Garden without changing puzzle
// difficulty, navigation, or store contracts.
//
// Intensity ramps up so later acts feel more alive: stronger glow on
// completed segments, slightly larger blossoms, more confident landmarks.
// Locked acts still stay dormant until their levels become unlocked.

export type WorldActId =
  // World 1 — Logic Garden
  | 'seed-grove'
  | 'moonvine-stream'
  | 'oracle-temple'
  // World 2 — Astral Nexus
  | 'prism-causeway'
  | 'starfall-archive'
  | 'celestial-engine';

export interface WorldAct {
  id: WorldActId;
  /** Display label — used in headers / future Profile breakdowns. */
  title: string;
  /** Inclusive level range this act covers. */
  fromLevel: number;
  toLevel: number;
  /** 0..1 intensity multiplier. Drives glow / scale / decoration density. */
  intensity: number;
  /** Primary act tint (RGB string acceptable to Skia color props). */
  primary: string;
  /** Secondary accent for highlights/landmarks. */
  accent: string;
  /** Soft wash colour used behind terrain blobs to differentiate the act. */
  wash: string;
}

/** Three-act structure for World 1. Add more entries to extend the world. */
export const WORLD_1_ACTS: WorldAct[] = [
  {
    id: 'seed-grove',
    title: 'Seed Grove',
    fromLevel: 1,
    toLevel: 10,
    intensity: 0.7,
    primary: '#5BD6A8',
    accent: '#5EE7C4',
    wash: 'rgba(91, 214, 168, 0.10)',
  },
  {
    id: 'moonvine-stream',
    title: 'Moonvine Stream',
    fromLevel: 11,
    toLevel: 20,
    intensity: 0.85,
    primary: '#7BA7F2',
    accent: '#00E5CC',
    wash: 'rgba(123, 167, 242, 0.12)',
  },
  {
    id: 'oracle-temple',
    title: 'Oracle Bloom Temple',
    fromLevel: 21,
    toLevel: 30,
    intensity: 1,
    primary: '#E0B96A',
    accent: '#5BD6A8',
    wash: 'rgba(224, 185, 106, 0.12)',
  },
];

/** Look up the act a given 1..30 level belongs to. Falls back to the
 *  first act if the level is out of range so callers can never null-out. */
export function getWorldActForLevel(level: number): WorldAct {
  const act = WORLD_1_ACTS.find(
    (a) => level >= a.fromLevel && level <= a.toLevel,
  );
  return act ?? WORLD_1_ACTS[0]!;
}

/** Returns true iff the given level is the final level of its act
 *  (level 10, 20, 30 today). Layers use this to render a stronger
 *  destination treatment for the act-finale milestone. */
export function isActFinaleLevel(level: number): boolean {
  return WORLD_1_ACTS.some((a) => a.toLevel === level);
}
