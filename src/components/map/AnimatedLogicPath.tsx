/**
 * Curved bezier path connecting all 30 nodes of the Logic Garden.
 *
 * Visual recipe (drawn in this order, all on a single Skia `<Canvas>`):
 *   1. Wide low-opacity outer glow stroke   — the "halo".
 *   2. Medium cyan stroke                   — the body of the vine.
 *   3. Thin gold/cyan bright core           — the energy along the spine.
 *   4. Animated traveling pulse             — a short bright dash that
 *      slides along the current segment, only on the active frontier.
 *
 * The path itself is split conceptually into three sub-paths:
 *   • completed segments (rendered with brighter cyan/gold)
 *   • current segment (rendered with the pulse)
 *   • locked future segments (dim, desaturated)
 *
 * The completed/current/locked split is computed from the progress
 * snapshot via `computePathProgress` in `mapMath.ts`.
 *
 * Performance: one Canvas, three full-path strokes, plus per-segment
 * stroked overlays — total ~60 draw calls for 30 nodes (29 segments × 2
 * strokes). That's well within Skia's iOS budget. The traveling pulse
 * lives in a `useDerivedValue` driven by `useSharedValue`-style clock so
 * the worklet never crosses the React boundary.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { colors } from '@/theme';
import {
  WORLD_1_ACTS,
  WORLD_1_NODE_LAYOUT,
  getWorldActForLevel,
  type MapNodeLayout,
  type WorldAct,
} from './mapLayout';
import {
  buildPathSegments,
  computePathProgress,
  type PathSegment,
} from './mapMath';

interface Props {
  width: number;
  /** Viewport height. The Canvas stays within Metal's 8192 px texture
   *  limit; world content is panned via `scrollY`. */
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  /** Returns true if the level is fully completed. */
  isCompleted: (level: number) => boolean;
  /** Returns true if the level is unlocked (or completed). */
  isUnlocked: (level: number) => boolean;
  /** Returns true if the level is the player's current frontier. */
  isCurrent: (level: number) => boolean;
}

const STROKE_WIDTHS = {
  outerGlow: 18,
  mid: 6,
  core: 2.4,
  pulse: 4,
  locked: 3,
};

/** Build a SkPath that traces a sub-range of the precomputed segments.
 *  Pulled out so the same code builds the completed sub-path, the current
 *  sub-path, and the locked sub-path. */
function buildSubPath(segments: readonly PathSegment[], yOffset: number): SkPath {
  const path = Skia.Path.Make();
  if (segments.length === 0) return path;
  const first = segments[0]!;
  path.moveTo(first.fromX, first.fromY + yOffset);
  for (const seg of segments) {
    path.quadTo(seg.controlX, seg.controlY + yOffset, seg.toX, seg.toY + yOffset);
  }
  return path;
}

/** Linear interpolation along a quadratic bezier. Used for the traveling
 *  pulse so we can place the pulse "ball" without rebuilding paths. */
function quadAt(seg: PathSegment, t: number): { x: number; y: number } {
  'worklet';
  const u = 1 - t;
  const x = u * u * seg.fromX + 2 * u * t * seg.controlX + t * t * seg.toX;
  const y = u * u * seg.fromY + 2 * u * t * seg.controlY + t * t * seg.toY;
  return { x, y };
}

export function AnimatedLogicPath({
  width,
  height,
  yOffset,
  scrollY,
  isCompleted,
  isUnlocked,
  isCurrent,
}: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  // 29 segments shared by every sub-path.
  const segments = useMemo(
    () => buildPathSegments(WORLD_1_NODE_LAYOUT, width),
    [width],
  );

  const progress = useMemo(
    () => computePathProgress(WORLD_1_NODE_LAYOUT as readonly MapNodeLayout[], isCompleted, isUnlocked, isCurrent),
    [isCompleted, isUnlocked, isCurrent],
  );

  // Pre-build the three sub-paths. Memoized so repaints only happen when
  // progress actually changes.
  const fullPath = useMemo(() => buildSubPath(segments, yOffset), [segments, yOffset]);
  const completedPath = useMemo(() => {
    const slice = segments.slice(0, Math.max(0, progress.completedThrough + 1));
    return buildSubPath(slice, yOffset);
  }, [segments, progress.completedThrough, yOffset]);
  const lockedStartIndex = progress.unlockedThrough + 1;
  const lockedPath = useMemo(() => {
    const slice = segments.slice(Math.max(0, lockedStartIndex));
    return buildSubPath(slice, yOffset);
  }, [segments, lockedStartIndex, yOffset]);

  // Per-act completed sub-paths. Each act gets its own SkPath built from
  // the *completed* segments that land in that act, so we can overlay
  // each act's signature colour on the segments the player has actually
  // conquered. The act of a segment is determined by the "to" node's
  // level (so segment 9→10 belongs to the seed-grove act, segment 10→11
  // to moonvine-stream, etc.).
  const completedActPaths = useMemo(() => {
    const out: { act: WorldAct; path: SkPath }[] = [];
    for (const act of WORLD_1_ACTS) {
      const sliceForAct = segments.filter((seg, idx) => {
        if (idx > progress.completedThrough) return false;
        const toLevel = WORLD_1_NODE_LAYOUT[idx + 1]?.level ?? 0;
        return getWorldActForLevel(toLevel).id === act.id;
      });
      out.push({ act, path: buildSubPath(sliceForAct, yOffset) });
    }
    return out;
  }, [segments, progress.completedThrough, yOffset]);

  // Current segment act drives the traveling pulse colour. Falls back
  // to gold-glow for the first segment when there's no current frontier.
  const currentSegAct = useMemo<WorldAct | null>(() => {
    if (progress.currentSegment == null) return null;
    const toLevel = WORLD_1_NODE_LAYOUT[progress.currentSegment + 1]?.level ?? 0;
    return getWorldActForLevel(toLevel);
  }, [progress.currentSegment]);
  const pulseColor = currentSegAct?.accent ?? colors.gardenGoldGlow;

  // Traveling pulse: a phase 0..1 cycling along the current segment.
  // Stays at a stationary "head of segment" position when reduced motion
  // is on so we never animate.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 0.5;
      return undefined;
    }
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reducedMotion, pulse, progress.currentSegment]);

  const currentSeg = progress.currentSegment != null ? segments[progress.currentSegment] ?? null : null;
  const pulseCx = useDerivedValue(() => {
    'worklet';
    if (!currentSeg) return -1000;
    return quadAt(currentSeg, pulse.value).x;
  }, [currentSeg]);
  const pulseCy = useDerivedValue(() => {
    'worklet';
    if (!currentSeg) return -1000;
    return quadAt(currentSeg, pulse.value).y + yOffset;
  }, [currentSeg, yOffset]);

  // World content translates by -scrollY so the path stays anchored to
  // the same world-y coords as the level nodes (which scroll 1:1 inside
  // the ScrollView).
  const worldTransform = useDerivedValue(() => {
    'worklet';
    return [{ translateY: -scrollY.value }];
  }, [scrollY]);

  return (
    <View
      style={[styles.fill, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={[styles.fill, { width, height }]}>
        <Group transform={worldTransform}>
          {/* Layer 1 — outer glow on the FULL path. Low opacity so it
              reads as halo, not as a chunky line. */}
          <Path
            path={fullPath}
            style="stroke"
            strokeWidth={STROKE_WIDTHS.outerGlow}
            strokeCap="round"
            strokeJoin="round"
            color={colors.gardenPathOuterGlow}
          />

          {/* Layer 2 — the dim locked tail. Drawn over the outer glow so
              the locked region looks "frosted" rather than dark. */}
          <Path
            path={lockedPath}
            style="stroke"
            strokeWidth={STROKE_WIDTHS.locked}
            strokeCap="round"
            strokeJoin="round"
            color={colors.gardenPathLocked}
          />

          {/* Layer 3 — mid cyan stroke on the FULL path. This is the
              visible vine body. */}
          <Path
            path={fullPath}
            style="stroke"
            strokeWidth={STROKE_WIDTHS.mid}
            strokeCap="round"
            strokeJoin="round"
            color={colors.gardenPathMid}
          />

          {/* Layer 4 — completed segments overlaid in brighter green, so
              they read as "you've conquered this part of the garden". */}
          <Path
            path={completedPath}
            style="stroke"
            strokeWidth={STROKE_WIDTHS.mid}
            strokeCap="round"
            strokeJoin="round"
            color={colors.gardenPathCompleted}
          />

          {/* Layer 4b — per-act tint on completed segments. Each act
              paints its own signature accent onto the segments that
              belong to it, so completed Seed Grove glows green-cyan,
              Moonvine glows blue-cyan, Oracle Bloom glows gold-teal.
              Stronger acts get more opacity. */}
          {completedActPaths.map(({ act, path }) => (
            <Path
              key={`act-${act.id}`}
              path={path}
              style="stroke"
              strokeWidth={STROKE_WIDTHS.mid * 0.7}
              strokeCap="round"
              strokeJoin="round"
              color={act.accent}
              opacity={0.32 + act.intensity * 0.32}
            />
          ))}

          {/* Layer 5 — gold core on FULL path. Thin, bright, premium. */}
          <Path
            path={fullPath}
            style="stroke"
            strokeWidth={STROKE_WIDTHS.core}
            strokeCap="round"
            strokeJoin="round"
            color={colors.gardenPathCore}
            opacity={0.85}
          />

          {/* Layer 6 — traveling pulse on the current segment.
              Implemented as two stacked circles that slide along the
              quadratic via derived positions: a small bright core + a
              larger soft halo. Hidden off-screen (-1000) when there's no
              current segment, which keeps draw count constant frame-to-
              frame instead of mounting/unmounting per progress change.
              Pulse colour follows the current segment's act so the
              player feels like they're entering a new chapter. */}
          {currentSeg ? (
            <>
              <Circle
                cx={pulseCx}
                cy={pulseCy}
                r={14}
                color={pulseColor}
                opacity={0.25}
              />
              <Circle
                cx={pulseCx}
                cy={pulseCy}
                r={6}
                color={pulseColor}
                opacity={0.95}
              />
            </>
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
