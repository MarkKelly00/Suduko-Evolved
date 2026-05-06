/**
 * Pure geometry helpers shared across every saga-map layer.
 *
 * Why centralized: the path drawer, vine drawer, terrain blob placer,
 * landmark drawer, level nodes, and unlock burst code all need to agree
 * on "where is node N in pixels right now?" — if any of them computes
 * positions independently the world drifts apart on resize.
 *
 * Everything here is pure JS so the same helpers run on the worklet
 * thread (for Reanimated/Skia driven derivations) and the JS thread
 * (for layout / `useMemo` computations).
 */

import {
  WORLD_1_NODE_LAYOUT,
  type MapNodeLayout,
} from './mapLayout';

/** Convert a normalized layout entry to absolute pixel coordinates for a
 *  given viewport width. The origin is the top-left of the scroll
 *  content area, not the screen. */
export function getNodePixel(
  layout: MapNodeLayout,
  viewportWidth: number,
): { x: number; y: number } {
  'worklet';
  return {
    x: layout.x * viewportWidth,
    y: layout.y,
  };
}

/** Compute pixel positions for every node in one pass. Memoize against
 *  `(layout array, width)` from the caller so this isn't recomputed per
 *  frame. */
export function buildNodePixels(
  layout: readonly MapNodeLayout[],
  viewportWidth: number,
): { x: number; y: number }[] {
  return layout.map((n) => ({ x: n.x * viewportWidth, y: n.y }));
}

/** A single quadratic-bezier segment between two consecutive nodes plus
 *  the control point used to draw it. Returned as plain numbers so the
 *  shape can be JSON-serialized + worklet-shared cheaply. */
export interface PathSegment {
  /** Index of the segment, matches `layout[fromLevel - 1]`. */
  index: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  controlX: number;
  controlY: number;
  /** Approximate arc length in pixels (used for traveling pulse math). */
  approxLength: number;
}

/**
 * Build the 29 quadratic-bezier segments that connect the 30 nodes.
 *
 * Control-point heuristic:
 *   • Sit the control roughly midway vertically.
 *   • Push it horizontally **away** from the midpoint of the two nodes
 *     by a fraction of the horizontal distance, alternating sign as you
 *     walk down the layout. That produces the gentle S-curve feel a
 *     hand-drawn saga path has, without ever crossing through a node.
 *
 * The function is deterministic and pure so memoizing on `(layout, width)`
 * is sufficient.
 */
export function buildPathSegments(
  layout: readonly MapNodeLayout[],
  viewportWidth: number,
): PathSegment[] {
  const pixels = buildNodePixels(layout, viewportWidth);
  const segs: PathSegment[] = [];
  for (let i = 0; i < pixels.length - 1; i++) {
    const a = pixels[i]!;
    const b = pixels[i + 1]!;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // Alternate the curve direction based on segment parity. Magnitude is
    // proportional to vertical distance so taller jumps get a wider arc.
    const sign = i % 2 === 0 ? 1 : -1;
    const horizontalNudge = sign * Math.max(48, Math.abs(dy) * 0.18);
    const controlX = midX + horizontalNudge;
    const controlY = midY;
    // Approximate arc length: chord + half the control-point detour.
    const chord = Math.hypot(dx, dy);
    const detour = Math.hypot(controlX - midX, controlY - midY);
    const approxLength = chord + detour;
    segs.push({
      index: i,
      fromX: a.x,
      fromY: a.y,
      toX: b.x,
      toY: b.y,
      controlX,
      controlY,
      approxLength,
    });
  }
  return segs;
}

/** Sum of all segment lengths — total path length, used for normalizing
 *  the traveling pulse to 0..1 along the whole world. */
export function totalPathLength(segs: readonly PathSegment[]): number {
  let n = 0;
  for (const s of segs) n += s.approxLength;
  return n;
}

/**
 * Visual progress markers along the path. Used by `AnimatedLogicPath`
 * to colour completed vs current vs locked segments.
 *
 * Definitions:
 *   • `completedThrough` — the highest segment **index** (0-based) whose
 *     "to" node is fully completed. Segments at this index and below
 *     render as completed (gold-tinted, full glow).
 *   • `currentSegment` — the segment whose "to" node is the level the
 *     player is about to play (current/unlocked frontier). It gets the
 *     traveling pulse.
 *   • `unlockedThrough` — the highest segment whose "to" node is at
 *     least unlocked. Segments past this index render dim/locked.
 */
export interface PathProgress {
  completedThrough: number;
  currentSegment: number | null;
  unlockedThrough: number;
}

/**
 * Compute path progress from progress-store snapshots. Pure: no React,
 * no worklets, just reads.
 */
export function computePathProgress(
  layout: readonly MapNodeLayout[],
  isCompleted: (level: number) => boolean,
  isUnlocked: (level: number) => boolean,
  isCurrent: (level: number) => boolean,
): PathProgress {
  let completedThrough = -1;
  let unlockedThrough = -1;
  let currentSegment: number | null = null;
  for (let i = 0; i < layout.length - 1; i++) {
    const toLevel = layout[i + 1]!.level;
    if (isCompleted(toLevel)) completedThrough = i;
    if (isCompleted(toLevel) || isUnlocked(toLevel)) unlockedThrough = i;
    if (currentSegment == null && isCurrent(toLevel)) currentSegment = i;
  }
  // Edge case: if the player has only level 1 (current) and nothing else
  // unlocked, currentSegment stays null. Mark segment 0 as current so the
  // very first arrow gets the pulse.
  if (currentSegment == null && layout.length > 1 && isCurrent(layout[0]!.level)) {
    currentSegment = 0;
  }
  return { completedThrough, currentSegment, unlockedThrough };
}

/** Convenience re-export so consumers don't need two imports. */
export { WORLD_1_NODE_LAYOUT };
