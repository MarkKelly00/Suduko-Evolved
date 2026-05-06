/**
 * Decorative vines + blossoms threaded along the saga path.
 *
 * The vines are short cubic-bezier curves that "spring off" each path
 * segment at its midpoint, ending in a small geometric blossom. They are
 * purely cosmetic — every consumer should still derive interaction state
 * from the level nodes themselves.
 *
 * Progress feedback: vines whose anchor segment leads into a completed
 * level render at full opacity (the garden is alive there); vines past
 * the unlocked frontier render at low opacity (still dormant).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  vec,
  RadialGradient,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/theme';
import {
  WORLD_1_NODE_LAYOUT,
  getWorldActForLevel,
  type MapNodeLayout,
} from './mapLayout';
import { buildPathSegments } from './mapMath';

interface Props {
  width: number;
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  isCompleted: (level: number) => boolean;
  isUnlocked: (level: number) => boolean;
}

interface Vine {
  /** Segment index this vine sprouts from. */
  index: number;
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  blossomR: number;
  /** Level whose progress drives the vine's opacity. */
  fromLevel: number;
}

function buildVines(layout: readonly MapNodeLayout[], width: number): Vine[] {
  const segments = buildPathSegments(layout, width);
  const vines: Vine[] = [];
  for (const seg of segments) {
    // Skip segments where the curve is very tight; vines look forced
    // there.
    const dy = Math.abs(seg.toY - seg.fromY);
    if (dy < 200) continue;
    const midX = (seg.fromX + seg.toX) / 2;
    const midY = (seg.fromY + seg.toY) / 2;
    // Sprout perpendicular to the bezier tangent — approximate by
    // taking the chord-perpendicular and scaling.
    const tx = seg.toX - seg.fromX;
    const ty = seg.toY - seg.fromY;
    const len = Math.max(1, Math.hypot(tx, ty));
    const nx = -ty / len;
    const ny = tx / len;
    // Alternate which side of the path the vine sprouts from.
    const side = seg.index % 2 === 0 ? 1 : -1;
    const reach = 64 + (seg.index % 3) * 14;
    const endX = midX + nx * reach * side;
    const endY = midY + ny * reach * side;
    const controlX = midX + nx * reach * 0.5 * side - tx * 0.08;
    const controlY = midY + ny * reach * 0.5 * side - ty * 0.08;
    vines.push({
      index: seg.index,
      startX: midX,
      startY: midY,
      controlX,
      controlY,
      endX,
      endY,
      blossomR: 6 + (seg.index % 4),
      fromLevel: layout[seg.index]!.level,
    });
  }
  return vines;
}

export function VineDecorations({
  width,
  height,
  yOffset,
  scrollY,
  isCompleted,
  isUnlocked,
}: Props) {
  const vines = useMemo(() => buildVines(WORLD_1_NODE_LAYOUT, width), [width]);

  const skiaPaths = useMemo(() => {
    return vines.map((v) => {
      const path = Skia.Path.Make();
      path.moveTo(v.startX, v.startY + yOffset);
      path.quadTo(v.controlX, v.controlY + yOffset, v.endX, v.endY + yOffset);
      return path;
    });
  }, [vines, yOffset]);

  const transform = useDerivedValue(() => {
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
        <Group transform={transform}>
          {vines.map((v, i) => {
            const completed = isCompleted(v.fromLevel);
            const unlocked = isUnlocked(v.fromLevel);
            const act = getWorldActForLevel(v.fromLevel);
            // Later acts get slightly larger blossoms so the world reads
            // as more "in bloom" as the player approaches the temple.
            const sizeScale = 0.85 + act.intensity * 0.5;
            const blossomR = v.blossomR * sizeScale;
            // Completed regions feel alive — both stroke + blossom get a
            // confident bump in opacity. Locked stays sparse.
            const opacity = completed ? 0.92 : unlocked ? 0.55 : 0.18;
            const stroke = completed
              ? act.accent
              : unlocked
                ? act.primary
                : colors.gardenPathLocked;
            const blossomTint = completed
              ? act.accent
              : unlocked
                ? act.primary
                : colors.gardenFog;
            const path = skiaPaths[i]!;
            return (
              <React.Fragment key={`vine-${i}`}>
                <Path
                  path={path}
                  style="stroke"
                  strokeWidth={1.4 + (completed ? 0.4 : 0)}
                  strokeCap="round"
                  strokeJoin="round"
                  color={stroke}
                  opacity={opacity}
                />
                {/* Blossom: a small radial gradient circle at the vine tip. */}
                <Circle cx={v.endX} cy={v.endY + yOffset} r={blossomR} opacity={opacity}>
                  <RadialGradient
                    c={vec(v.endX, v.endY + yOffset)}
                    r={blossomR}
                    colors={[blossomTint, 'rgba(0,0,0,0)']}
                  />
                </Circle>
              </React.Fragment>
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
