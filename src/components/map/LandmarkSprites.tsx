/**
 * Generic high-fidelity landmark renderer, shared by both worlds.
 *
 * Renders large, animated, premium Grok-Imagine sprites as ambient BACKGROUND
 * set-pieces behind the path/nodes (z-order set by the parent in SagaMap). Each
 * sprite is a transparent PNG (alpha baked from luminance) so it composites
 * cleanly over the map. Radial set-pieces slowly rotate; all breathe — both
 * frozen under reduced motion.
 *
 * Per-world wrappers (`WorldLandmark`, `GardenLandmark`) load their sprite set
 * with `useImage` and pass a `spriteFor` lookup here, so the loading hooks stay
 * fixed-count per world while this render logic is shared.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  RadialGradient,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import type { MapLandmark, MapNodeLayout, WorldAct } from './mapLayout';

interface Props {
  width: number;
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  isCompleted: (level: number) => boolean;
  isUnlocked: (level: number) => boolean;
  /** Globalized layout (y already in combined scroll space). */
  layout: readonly MapNodeLayout[];
  actForLevel: (level: number) => WorldAct;
  /** Resolve the loaded sprite for a landmark name (null while loading). */
  spriteFor: (name: MapLandmark) => SkImage | null;
  /** Landmark names that slowly rotate (radial set-pieces). All breathe. */
  rotating: ReadonlySet<MapLandmark>;
  /** Whether a level is an act finale (larger sprite + stronger halo). */
  isFinale: (level: number) => boolean;
  /** React-key namespace so two instances don't collide. */
  keyPrefix: string;
}

const BASE_SIZE = 300;

interface LandmarkSpec {
  level: number;
  name: MapLandmark;
  cx: number;
  cy: number;
  size: number;
  haloRadius: number;
}

function buildLandmarks(
  layout: readonly MapNodeLayout[],
  width: number,
  isFinale: (level: number) => boolean,
): LandmarkSpec[] {
  return layout
    .filter((n): n is MapNodeLayout & { landmark: MapLandmark } => n.landmark != null)
    .map((n) => {
      const finale = isFinale(n.level);
      return {
        level: n.level,
        name: n.landmark,
        cx: n.x * width,
        cy: n.y - 18,
        size: BASE_SIZE * (finale ? 1.5 : 1),
        haloRadius: finale ? 230 : 150,
      };
    });
}

export function LandmarkSprites({
  width,
  height,
  yOffset,
  scrollY,
  isCompleted,
  isUnlocked,
  layout,
  actForLevel,
  spriteFor,
  rotating,
  isFinale,
  keyPrefix,
}: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const landmarks = useMemo(
    () => buildLandmarks(layout, width, isFinale),
    [layout, width, isFinale],
  );

  // Slow rotation + breathing clocks, frozen under reduced motion.
  const rotationRaw = useSharedValue(0);
  const pulseRaw = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) {
      rotationRaw.value = 0;
      pulseRaw.value = 1;
      return undefined;
    }
    rotationRaw.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 38000, easing: Easing.linear }),
      -1,
      false,
    );
    pulseRaw.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rotationRaw);
      cancelAnimation(pulseRaw);
    };
  }, [reducedMotion, rotationRaw, pulseRaw]);

  const pulseOnly = useDerivedValue(() => [{ scale: pulseRaw.value }], [pulseRaw]);
  const rotatePulse = useDerivedValue(
    () => [{ rotate: rotationRaw.value }, { scale: pulseRaw.value }],
    [rotationRaw, pulseRaw],
  );

  const panTransform = useDerivedValue(() => {
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
        <Group transform={panTransform}>
          {landmarks.map((spec) => {
            const completed = isCompleted(spec.level);
            const active = completed || isUnlocked(spec.level);
            const act = actForLevel(spec.level);
            const cy = spec.cy + yOffset;
            const origin = vec(spec.cx, cy);
            const img = spriteFor(spec.name);
            const dyn = rotating.has(spec.name) ? rotatePulse : pulseOnly;
            // Ambient background pieces — visible whether locked or not (the
            // NODES convey lock state). Kept a touch translucent so the path
            // and node numbers (drawn on top) stay legible over them.
            const spriteOpacity = completed ? 0.9 : active ? 0.78 : 0.6;
            const x = spec.cx - spec.size / 2;
            const y = cy - spec.size / 2;
            return (
              <Group key={`${keyPrefix}-landmark-${spec.level}`}>
                {spec.haloRadius > 0 && active ? (
                  <Circle cx={spec.cx} cy={cy} r={spec.haloRadius} opacity={completed ? 0.3 : 0.16}>
                    <RadialGradient
                      c={vec(spec.cx, cy)}
                      r={spec.haloRadius}
                      colors={[act.accent, 'rgba(0,0,0,0)']}
                    />
                  </Circle>
                ) : null}
                {img ? (
                  <Group origin={origin} transform={dyn}>
                    <SkiaImage
                      image={img}
                      x={x}
                      y={y}
                      width={spec.size}
                      height={spec.size}
                      fit="contain"
                      opacity={spriteOpacity}
                    />
                  </Group>
                ) : (
                  <Circle cx={spec.cx} cy={cy} r={spec.size * 0.32} opacity={active ? 0.4 : 0.18}>
                    <RadialGradient
                      c={vec(spec.cx, cy)}
                      r={spec.size * 0.32}
                      colors={[act.accent, 'rgba(0,0,0,0)']}
                    />
                  </Circle>
                )}
              </Group>
            );
          })}
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
