/**
 * Fixed full-screen Skia backdrop for the Logic Garden world.
 *
 * Drawn ONCE per layout change and once per scroll-driven transform. The
 * backdrop is intentionally calm: a deep navy radial gradient + a faint
 * neural grid + 8 distant bioluminescent orbs + a vignette mask. No
 * particles here (those live in `ParticleField`); no path (that lives
 * in `AnimatedLogicPath`).
 *
 * Parallax is achieved by translating the entire Skia `<Group>` along Y
 * with a fraction of the scroll offset (0.18 — slow enough that the
 * backdrop reads as "distant atmosphere" not "scrolling content").
 *
 * Performance notes:
 *   • One Canvas, ~12 draw primitives total.
 *   • Orbs are static positions; only `transform` changes per scroll.
 *   • Reduced motion → parallax factor collapses to 0.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { colors } from '@/theme';

interface Props {
  /** Viewport width in pixels. */
  width: number;
  /** Viewport height in pixels. */
  height: number;
  /** Reanimated SharedValue carrying the live ScrollView offsetY. */
  scrollY: SharedValue<number>;
}

/** Parallax factor: how much the backdrop translates per pixel of
 *  ScrollView scroll. 0.18 = the backdrop drifts at ~18% of the scroll
 *  speed, giving a subtle "deep distance" feel. */
const PARALLAX = 0.18;

/** Ambient orb positions in normalized [0..1] coordinates so they spread
 *  predictably regardless of device width/height. Hand-tuned so no orb
 *  sits behind the world header or the typical first node. */
const ORBS: { x: number; y: number; radius: number; opacity: number; tint: string }[] = [
  { x: 0.22, y: 0.18, radius: 110, opacity: 0.18, tint: colors.gardenBloom },
  { x: 0.78, y: 0.34, radius: 140, opacity: 0.14, tint: colors.gardenCyan },
  { x: 0.12, y: 0.52, radius: 95,  opacity: 0.12, tint: colors.gardenCyanGlow },
  { x: 0.88, y: 0.66, radius: 130, opacity: 0.16, tint: colors.gardenBloom },
  { x: 0.32, y: 0.78, radius: 80,  opacity: 0.10, tint: colors.gardenGold },
  { x: 0.62, y: 0.92, radius: 150, opacity: 0.20, tint: colors.gardenCyan },
  { x: 0.50, y: 0.42, radius: 70,  opacity: 0.08, tint: colors.gardenGoldGlow },
  { x: 0.08, y: 0.86, radius: 100, opacity: 0.12, tint: colors.gardenBloom },
];

/** Faint neural grid spacing in pixels. ~80 px gives ~5 verticals on a
 *  390-wide phone — enough to imply structure without crosshatching. */
const GRID_SPACING = 80;

export function ParallaxBackdrop({ width, height, scrollY }: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  // Backdrop transform = vertical translation only. Wrapped in a derived
  // value so the entire `<Group>` re-renders on the UI thread per frame.
  const transform = useDerivedValue(() => {
    'worklet';
    const factor = reducedMotion ? 0 : PARALLAX;
    // Translate UP as the player scrolls DOWN, but at parallax speed —
    // so the backdrop *seems* to recede slightly. Negative because RN
    // ScrollView reports a positive scroll offset for downward scroll.
    return [{ translateY: -scrollY.value * factor }];
  }, [scrollY, reducedMotion]);

  // Pre-compute pixel positions for orbs + grid so the worklet doesn't
  // have to.
  const orbs = useMemo(
    () =>
      ORBS.map((o) => ({
        cx: o.x * width,
        cy: o.y * height,
        r: o.radius,
        opacity: o.opacity,
        tint: o.tint,
      })),
    [width, height],
  );

  const verticals = useMemo(() => {
    const lines: { x: number }[] = [];
    for (let x = GRID_SPACING / 2; x < width; x += GRID_SPACING) lines.push({ x });
    return lines;
  }, [width]);

  const horizontals = useMemo(() => {
    const lines: { y: number }[] = [];
    // Render extra rows above + below the viewport so the parallax
    // translation never reveals an empty edge.
    const overscan = height * 0.5;
    for (let y = -overscan; y < height + overscan; y += GRID_SPACING) lines.push({ y });
    return lines;
  }, [height]);

  return (
    <View
      style={[styles.fill, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={[styles.fill, { width, height }]}>
        {/* Deep radial gradient base — looks like night sky with a faint
            inner glow. */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.5, height * 0.42)}
            r={Math.max(width, height) * 0.85}
            colors={[colors.gardenSky, colors.gardenSkyDeep]}
          />
        </Rect>

        {/* The parallaxed layer — grid + orbs travel with scrollY but
            slower than the world stage. */}
        <Group transform={transform}>
          {/* Faint neural grid — one stroked Rect per gridline gives
              correct line antialiasing without per-line shaders. */}
          {verticals.map((v, i) => (
            <Rect
              key={`v-${i}`}
              x={v.x}
              y={-height * 0.5}
              width={1}
              height={height * 2}
              color={colors.gardenGridLine}
            />
          ))}
          {horizontals.map((h, i) => (
            <Rect
              key={`h-${i}`}
              x={0}
              y={h.y}
              width={width}
              height={1}
              color={colors.gardenGridLine}
            />
          ))}

          {/* Distant bioluminescent orbs — radial gradient so the edge
              feathers naturally without any blur shader cost. */}
          {orbs.map((o, i) => (
            <Circle key={`orb-${i}`} cx={o.cx} cy={o.cy} r={o.r} opacity={o.opacity}>
              <RadialGradient
                c={vec(o.cx, o.cy)}
                r={o.r}
                colors={[o.tint, 'rgba(0,0,0,0)']}
              />
            </Circle>
          ))}
        </Group>

        {/* Top + bottom vignette — reads as atmospheric depth without a
            blur pass. Sits OUTSIDE the parallax group so it's locked to
            the viewport. */}
        <Rect x={0} y={0} width={width} height={height * 0.18}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height * 0.18)}
            colors={[colors.gardenVignette, 'rgba(7,11,23,0)']}
          />
        </Rect>
        <Rect x={0} y={height * 0.78} width={width} height={height * 0.22}>
          <LinearGradient
            start={vec(0, height * 0.78)}
            end={vec(0, height)}
            colors={['rgba(7,11,23,0)', colors.gardenVignette]}
          />
        </Rect>
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
