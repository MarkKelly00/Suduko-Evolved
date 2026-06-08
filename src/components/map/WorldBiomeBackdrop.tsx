/**
 * WorldBiomeBackdrop — cosmic terrain layer for World 2 (Astral Nexus).
 *
 * The World 1 equivalent is `GardenBackground` (soft floating-island blobs).
 * For the Astral Nexus the "terrain" is celestial: per-act radial washes, soft
 * glows under each node cluster, a faint deterministic starfield, and a few
 * geometric prism/constellation set-pieces. Purely decorative —
 * `pointerEvents="none"`, accessibility-hidden, panned by `-scrollY` like every
 * other Skia world layer (viewport-sized Canvas, no texture-limit risk).
 *
 * Reduced motion: nothing here animates, so it's already reduced-motion-safe.
 * Effect strength scales with `theme.shaderIntensity`.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { MapNodeLayout, WorldAct } from './mapLayout';
import type { WorldTheme } from './worldThemes';

interface Props {
  width: number;
  height: number;
  /** Same yOffset every world layer uses (MAP_TOP_PADDING + safe-area top). */
  yOffset: number;
  scrollY: SharedValue<number>;
  /** Globalized World 2 layout (y already in combined scroll space). */
  layout: readonly MapNodeLayout[];
  acts: readonly WorldAct[];
  theme: WorldTheme;
  /** Resolve the act for a (global) level — for cluster tinting. */
  actForLevel: (level: number) => WorldAct;
}

/** Tiny deterministic hash → [0,1). Keeps the starfield stable across renders
 *  without Math.random (which is also banned in worklet-shared code paths). */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function WorldBiomeBackdrop({
  width,
  height,
  yOffset,
  scrollY,
  layout,
  acts,
  theme,
  actForLevel,
}: Props) {
  const transform = useDerivedValue(() => {
    'worklet';
    return [{ translateY: -scrollY.value }];
  }, [scrollY]);

  // Act washes — one wide radial gradient centered on each act's vertical
  // midpoint, tinted with the act primary.
  const actWashes = useMemo(() => {
    return acts.map((act) => {
      const fromY = layout.find((n) => n.level === act.fromLevel)?.y ?? 0;
      const toY = layout.find((n) => n.level === act.toLevel)?.y ?? fromY;
      return {
        id: act.id,
        cx: width * 0.5,
        cy: (fromY + toY) / 2 + yOffset,
        r: Math.max(width, (toY - fromY) * 0.7) + 220,
        color: act.primary,
        opacity: 0.1 * theme.shaderIntensity,
      };
    });
  }, [acts, layout, width, yOffset, theme.shaderIntensity]);

  // Soft glow under each node cluster (every node gets a faint pool tinted
  // by its act accent so the path reads as travelling between lit waypoints).
  const clusterGlows = useMemo(() => {
    return layout.map((n) => ({
      key: n.level,
      cx: n.x * width,
      cy: n.y + yOffset,
      r: 120,
      color: actForLevel(n.level).accent,
      opacity: 0.08 * theme.shaderIntensity,
    }));
  }, [layout, width, yOffset, actForLevel, theme.shaderIntensity]);

  // Faint starfield spread across the World 2 y-range.
  const stars = useMemo(() => {
    if (layout.length === 0) return [];
    const minY = layout[0]!.y + yOffset - 200;
    const maxY = layout[layout.length - 1]!.y + yOffset + 200;
    const span = maxY - minY;
    const count = 44;
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      cx: rand(i + 1) * width,
      cy: minY + rand(i + 7.3) * span,
      r: 0.8 + rand(i + 2.1) * 1.6,
      opacity: (0.18 + rand(i + 5.5) * 0.4) * theme.shaderIntensity,
      tint: theme.particlePalette[i % theme.particlePalette.length]!,
    }));
  }, [layout, width, yOffset, theme.shaderIntensity, theme.particlePalette]);

  return (
    <View
      style={[styles.fill, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={[styles.fill, { width, height }]}>
        <Group transform={transform}>
          {actWashes.map((w) => (
            <Circle key={`wash-${w.id}`} cx={w.cx} cy={w.cy} r={w.r} opacity={w.opacity}>
              <RadialGradient c={vec(w.cx, w.cy)} r={w.r} colors={[w.color, 'rgba(0,0,0,0)']} />
            </Circle>
          ))}
          {stars.map((s) => (
            <Circle key={`star-${s.key}`} cx={s.cx} cy={s.cy} r={s.r} color={s.tint} opacity={s.opacity} />
          ))}
          {clusterGlows.map((g) => (
            <Circle key={`glow-${g.key}`} cx={g.cx} cy={g.cy} r={g.r} opacity={g.opacity}>
              <RadialGradient c={vec(g.cx, g.cy)} r={g.r} colors={[g.color, 'rgba(0,0,0,0)']} />
            </Circle>
          ))}
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
