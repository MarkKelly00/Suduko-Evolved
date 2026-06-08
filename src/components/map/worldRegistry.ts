/**
 * World registry — assembles the per-world layouts/acts/themes into ONE
 * continuous vertical scroll space for the saga map.
 *
 * World 1 keeps its original coordinates (origin 0). World 2 is placed below
 * it: a `PORTAL_GAP` of empty space (where the WorldUnlockPortal + WorldHeader
 * card live) then World 2's local node coordinates offset by `WORLD_2_Y_ORIGIN`.
 *
 * Everything is gated by `isWorldEnabled` so when Astral Nexus is flagged off
 * the combined model collapses to exactly World 1 — same nodes, same content
 * height, same everything — giving a clean rollback.
 *
 * Geometry note: each map layer is a viewport-sized fixed Skia Canvas that pans
 * its contents by `-scrollY`. Doubling the virtual scroll height does NOT grow
 * any Canvas (they stay viewport-sized), so there is no texture-limit risk —
 * only the ScrollView content height grows.
 */

import {
  WORLD_1_NODE_LAYOUT,
  WORLD_1_ACTS,
  MAP_CONTENT_HEIGHT,
  type MapNodeLayout,
  type WorldAct,
} from './mapLayout';
import {
  WORLD_2_NODE_LAYOUT,
  WORLD_2_ACTS,
  WORLD_2_BOTTOM_PADDING,
} from './world2Layout';
import { WORLD_1_THEME, WORLD_2_THEME, type WorldTheme } from './worldThemes';
import { WORLD_1, WORLD_2 } from '@/game/content/worlds';
import { levelIdForGlobal } from '@/game/content/levels';
import { isWorldEnabled } from '@/game/config/featureFlags';

/** Last World 1 node y (origin for the portal gap). */
const WORLD_1_LAST_Y = WORLD_1_NODE_LAYOUT[WORLD_1_NODE_LAYOUT.length - 1]!.y;

/** Empty band between World 1's finale and World 2's first node. Holds the
 *  unlock portal + the World 2 header card, stacked vertically with clear
 *  separation so the header card never overlaps level 31 — but kept compact so
 *  the transition doesn't read as dead space. */
export const PORTAL_GAP = 720;

/** Global-y at which World 2's LOCAL coordinates begin. */
export const WORLD_2_Y_ORIGIN = WORLD_1_LAST_Y + PORTAL_GAP;

export interface WorldDef {
  id: string;
  worldNumber: number;
  name: string;
  tagline: string;
  /** Global level range. */
  globalLevelStart: number;
  globalLevelEnd: number;
  /** Y added to each node's local y to place the world in combined space. */
  yOrigin: number;
  layout: MapNodeLayout[];
  acts: WorldAct[];
  theme: WorldTheme;
  enabled: boolean;
}

const WORLD_1_DEF: WorldDef = {
  id: WORLD_1.id,
  worldNumber: 1,
  name: WORLD_1.name,
  tagline: WORLD_1.tagline,
  globalLevelStart: 1,
  globalLevelEnd: 30,
  yOrigin: 0,
  layout: WORLD_1_NODE_LAYOUT,
  acts: WORLD_1_ACTS,
  theme: WORLD_1_THEME,
  enabled: true,
};

const WORLD_2_DEF: WorldDef = {
  id: WORLD_2.id,
  worldNumber: 2,
  name: WORLD_2.name,
  tagline: WORLD_2.tagline,
  globalLevelStart: 31,
  globalLevelEnd: 60,
  yOrigin: WORLD_2_Y_ORIGIN,
  layout: WORLD_2_NODE_LAYOUT,
  acts: WORLD_2_ACTS,
  theme: WORLD_2_THEME,
  enabled: isWorldEnabled(WORLD_2.id),
};

const ALL_WORLD_DEFS: WorldDef[] = [WORLD_1_DEF, WORLD_2_DEF];

/** World defs that should render (World 2 only when its flag is on). */
export function getEnabledWorldDefs(): WorldDef[] {
  return ALL_WORLD_DEFS.filter((w) => w.enabled);
}

export function getWorldDef(worldId: string): WorldDef | null {
  return ALL_WORLD_DEFS.find((w) => w.id === worldId) ?? null;
}

/** Which world owns a given global level (1–60). */
export function getWorldDefForGlobalLevel(globalLevel: number): WorldDef {
  return globalLevel <= WORLD_1_DEF.globalLevelEnd ? WORLD_1_DEF : WORLD_2_DEF;
}

/** Act containing a global level (1–60). */
export function getActForGlobalLevel(globalLevel: number): WorldAct {
  const world = getWorldDefForGlobalLevel(globalLevel);
  return (
    world.acts.find((a) => globalLevel >= a.fromLevel && globalLevel <= a.toLevel) ??
    world.acts[0]!
  );
}

export interface CombinedNode {
  worldId: string;
  worldNumber: number;
  worldName: string;
  /** Global display number, 1–60. */
  globalLevel: number;
  /** `world1-level-N` / `world2-level-N`. */
  levelId: string;
  /** Normalized x (0..1). */
  x: number;
  /** Absolute y in the combined scroll content (local y + world yOrigin). */
  globalY: number;
  biome: MapNodeLayout['biome'];
  landmark?: MapNodeLayout['landmark'];
  act: WorldAct;
  isWorldStart: boolean;
  isWorldFinale: boolean;
}

/** Build the flat list of every node across enabled worlds, in global space. */
export function buildCombinedNodes(): CombinedNode[] {
  const nodes: CombinedNode[] = [];
  for (const world of getEnabledWorldDefs()) {
    for (const n of world.layout) {
      nodes.push({
        worldId: world.id,
        worldNumber: world.worldNumber,
        worldName: world.name,
        globalLevel: n.level,
        levelId: levelIdForGlobal(n.level),
        x: n.x,
        globalY: n.y + world.yOrigin,
        biome: n.biome,
        landmark: n.landmark,
        act: getActForGlobalLevel(n.level),
        isWorldStart: n.level === world.globalLevelStart,
        isWorldFinale: n.level === world.globalLevelEnd,
      });
    }
  }
  return nodes;
}

/** A world's layout with y values shifted into combined/global space. Used by
 *  the per-world Skia layers so they share the same `yOffset` as World 1. */
export function getGlobalizedLayout(worldId: string): MapNodeLayout[] {
  const world = getWorldDef(worldId);
  if (!world) return [];
  if (world.yOrigin === 0) return world.layout;
  return world.layout.map((n) => ({ ...n, y: n.y + world.yOrigin }));
}

/** Total scroll content height across enabled worlds. */
export function combinedContentHeight(): number {
  const worlds = getEnabledWorldDefs();
  if (worlds.length <= 1) return MAP_CONTENT_HEIGHT;
  // World 2 is the deepest: its origin + its local content height.
  return WORLD_2_Y_ORIGIN + WORLD_2_NODE_LAYOUT[WORLD_2_NODE_LAYOUT.length - 1]!.y + WORLD_2_BOTTOM_PADDING;
}

/** Whether the second world is part of the combined model right now. */
export function isAstralNexusInPlay(): boolean {
  return getEnabledWorldDefs().some((w) => w.id === WORLD_2.id);
}

/** Global-y of the dormant/active world-unlock portal — sits just below the
 *  Logic Garden temple so its energy reads as flowing up out of World 1. */
export function portalAnchorY(): number {
  return WORLD_1_LAST_Y + 270;
}

/** Global-y (the card's TOP) where the World 2 header card sits. Placed above
 *  level 31 so the card clears both the node and its Nexus Gate sprite with a
 *  comfortable margin, while sitting just under the portal. */
export function worldHeaderAnchorY(): number {
  return WORLD_2_Y_ORIGIN + WORLD_2_NODE_LAYOUT[0]!.y - 470;
}

/** Global-y of World 2's first node (scroll target for the "Enter" CTA). */
export function world2EntryY(): number {
  return WORLD_2_Y_ORIGIN + WORLD_2_NODE_LAYOUT[0]!.y;
}

export interface ActBucket {
  act: WorldAct;
  worldId: string;
  worldNumber: number;
  worldName: string;
  /** Act index WITHIN its world (0..2) → roman numeral I/II/III per world. */
  actIndexInWorld: number;
  fromGlobal: number;
  toGlobal: number;
  /** Global-y midpoint of the act's node cluster. */
  yMidpoint: number;
}

/** Ordered act buckets across enabled worlds, for the ActProgressHeader. */
export function getActBuckets(): ActBucket[] {
  const buckets: ActBucket[] = [];
  for (const world of getEnabledWorldDefs()) {
    world.acts.forEach((act, i) => {
      const fromY =
        world.layout.find((n) => n.level === act.fromLevel)?.y ?? 0;
      const toY = world.layout.find((n) => n.level === act.toLevel)?.y ?? fromY;
      buckets.push({
        act,
        worldId: world.id,
        worldNumber: world.worldNumber,
        worldName: world.name,
        actIndexInWorld: i,
        fromGlobal: act.fromLevel,
        toGlobal: act.toLevel,
        yMidpoint: (fromY + toY) / 2 + world.yOrigin,
      });
    });
  }
  return buckets;
}
