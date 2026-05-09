/**
 * BiomeTransitionGate
 *
 * Decorative Skia layer that draws an act-to-act gate between two
 * neighbouring biomes:
 *   • Level 10 → 11  (Seed Grove → Moonvine Stream)
 *   • Level 20 → 21  (Moonvine Stream → Oracle Bloom Temple)
 *
 * The gate sits midway between the two boundary levels' y-positions and
 * spans the path. Visual treatment:
 *   • Two slim columns flanking the path centerline.
 *   • A soft arch/halo above colored as a gradient FROM the previous
 *     act's accent TO the next act's primary.
 *   • Dormant when the next act is locked (low opacity, desaturated).
 *   • Active when the next act has any unlocked level (full glow + a
 *     gentle vertical pulse).
 *
 * Renders in a viewport-fixed Canvas that pans by `-scrollY`, identical
 * to GardenLandmarks. Pure decoration — pointerEvents are off and the
 * Pressable layer above receives all taps.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  WORLD_1_ACTS,
  WORLD_1_NODE_LAYOUT,
  type WorldAct,
} from './mapLayout';

interface Props {
  width: number;
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  isCompleted: (level: number) => boolean;
  isUnlocked: (level: number) => boolean;
}

interface GateConfig {
  y: number;
  centerX: number;
  fromAct: WorldAct;
  toAct: WorldAct;
  /** When true the gate's "ahead" act has any unlocked levels — render
   *  the active glow palette. Otherwise render the dormant variant. */
  isOpened: boolean;
  fromLevel: number;
  toLevel: number;
}

export function BiomeTransitionGate({
  width,
  height,
  yOffset,
  scrollY,
  isCompleted,
  isUnlocked,
}: Props) {
  // Build one gate per adjacent (act_n.toLevel → act_{n+1}.fromLevel) pair.
  // Layout array is the source of geometry. Recompute only when act
  // configuration or width changes (rare).
  const gates = useMemo<GateConfig[]>(() => {
    const out: GateConfig[] = [];
    for (let i = 0; i < WORLD_1_ACTS.length - 1; i++) {
      const from = WORLD_1_ACTS[i]!;
      const to = WORLD_1_ACTS[i + 1]!;
      const fromNode = WORLD_1_NODE_LAYOUT.find((n) => n.level === from.toLevel);
      const toNode = WORLD_1_NODE_LAYOUT.find((n) => n.level === to.fromLevel);
      if (!fromNode || !toNode) continue;
      const y = (fromNode.y + toNode.y) / 2;
      const centerX = ((fromNode.x + toNode.x) / 2) * width;
      const isOpened =
        isUnlocked(to.fromLevel) || isCompleted(from.toLevel);
      out.push({
        y,
        centerX,
        fromAct: from,
        toAct: to,
        isOpened,
        fromLevel: from.toLevel,
        toLevel: to.fromLevel,
      });
    }
    return out;
  }, [isCompleted, isUnlocked, width]);

  // Pan the entire Canvas content by -scrollY so the gates ride the scroll.
  const transform = useDerivedValue(
    () => [{ translateY: yOffset - scrollY.value }],
    [yOffset],
  );

  if (gates.length === 0) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={{ width, height }}>
        <Group transform={transform}>
          {gates.map((g, idx) => (
            <Gate key={idx} cfg={g} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

// ─── Single gate ────────────────────────────────────────────────────────────

const Gate = React.memo(function Gate({ cfg }: { cfg: GateConfig }) {
  const { y, centerX, fromAct, toAct, isOpened } = cfg;

  // Gate dimensions in scroll-content pixels.
  const gateWidth = 220;
  const gateHeight = 110;
  const halfW = gateWidth / 2;
  const archTop = y - gateHeight / 2;
  const archBottom = y + gateHeight / 2;

  // Color: gradient from previous act's accent to next act's primary.
  const fromColor = isOpened ? toAct.primary : 'rgba(74, 88, 120, 0.55)';
  const toColor = isOpened ? fromAct.accent : 'rgba(74, 88, 120, 0.35)';
  const haloOpacity = isOpened ? 0.7 : 0.18;
  const columnOpacity = isOpened ? 0.85 : 0.35;

  // Procedural arch curve — quadratic, top of arch ~halfHeight above center.
  const arch: SkPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(centerX - halfW, archBottom);
    p.quadTo(centerX, archTop - 28, centerX + halfW, archBottom);
    return p;
  }, [centerX, halfW, archBottom, archTop]);

  return (
    <Group opacity={isOpened ? 1 : 0.7}>
      {/* Soft halo behind the arch */}
      <Circle cx={centerX} cy={y - 12} r={isOpened ? 78 : 50} opacity={haloOpacity}>
        <RadialGradient
          c={vec(centerX, y - 12)}
          r={isOpened ? 78 : 50}
          colors={[fromColor, 'transparent']}
        />
      </Circle>

      {/* Two flanking columns (left + right) */}
      <Rect
        x={centerX - halfW - 6}
        y={archBottom - 6}
        width={12}
        height={48}
        color={fromColor}
        opacity={columnOpacity}
      />
      <Rect
        x={centerX + halfW - 6}
        y={archBottom - 6}
        width={12}
        height={48}
        color={fromColor}
        opacity={columnOpacity}
      />

      {/* Inner arch path with the gradient accent */}
      <Path
        path={arch}
        style="stroke"
        strokeWidth={4.5}
        color={toColor}
        opacity={isOpened ? 0.95 : 0.4}
      />

      {/* Brighter ridge on top of the arch when active */}
      {isOpened && (
        <Path
          path={arch}
          style="stroke"
          strokeWidth={1.5}
          color={fromAct.accent}
          opacity={0.7}
        />
      )}
    </Group>
  );
});
