/**
 * Small animated geometric flower emblem that sits beside the world
 * header. Drawn in a tiny Skia canvas (~64 px) so it adds at most a
 * dozen draw calls regardless of the world content.
 *
 * Visual: an 8-petal radial flower with a glowing core, slowly rotating
 * with a soft opacity pulse — same cyan/gold language as the path and
 * level nodes so the header reads as part of the world rather than a
 * tacked-on title bar.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { colors } from '@/theme';

interface Props {
  /** Outer pixel size of the emblem (square). */
  size?: number;
}

const PETALS = 8;

export function WorldHeaderEmblem({ size = 56 }: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const center = size / 2;

  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0.7);

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = 0;
      pulse.value = 0.85;
      return undefined;
    }
    rotation.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 18000, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
    };
  }, [reducedMotion, rotation, pulse]);

  const transform = useDerivedValue(() => {
    'worklet';
    return [{ rotate: rotation.value }];
  }, [rotation]);

  const petalsPath = useMemo(() => {
    // One closed sub-path per petal; combined into a single SkPath so
    // Skia issues a single fill call.
    const path = Skia.Path.Make();
    const petalLen = size * 0.42;
    for (let i = 0; i < PETALS; i++) {
      const a = (i / PETALS) * Math.PI * 2;
      const tipX = center + Math.cos(a) * petalLen;
      const tipY = center + Math.sin(a) * petalLen;
      const c1X = center + Math.cos(a - 0.2) * petalLen * 0.45;
      const c1Y = center + Math.sin(a - 0.2) * petalLen * 0.45;
      const c2X = center + Math.cos(a + 0.2) * petalLen * 0.45;
      const c2Y = center + Math.sin(a + 0.2) * petalLen * 0.45;
      path.moveTo(center, center);
      path.quadTo(c1X, c1Y, tipX, tipY);
      path.quadTo(c2X, c2Y, center, center);
      path.close();
    }
    return path;
  }, [size, center]);

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logic Garden emblem"
    >
      <Canvas style={[styles.fill, { width: size, height: size }]}>
        {/* Origin at center so rotation transforms cleanly. */}
        <Group origin={vec(center, center)} transform={transform}>
          <Path
            path={petalsPath}
            style="stroke"
            strokeWidth={1.2}
            color={colors.gardenCyanGlow}
            opacity={0.9}
          />
          <Path
            path={petalsPath}
            color={colors.gardenCyanGlow}
            opacity={pulse}
          />
        </Group>
        {/* Glowing core — sits centered, doesn't rotate. */}
        <Circle cx={center} cy={center} r={size * 0.14} opacity={0.95}>
          <RadialGradient
            c={vec(center, center)}
            r={size * 0.18}
            colors={[colors.gardenGoldGlow, 'rgba(0,0,0,0)']}
          />
        </Circle>
        <Circle cx={center} cy={center} r={size * 0.05} color={colors.gardenGoldGlow} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
