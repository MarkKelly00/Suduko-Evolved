import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';

interface Props {
  /** 0..8 — which 3x3 box was completed. */
  boxIndex: number;
  cellSize: number;
  reducedMotion?: boolean;
}

/**
 * Crystal burst from the center of a completed 3×3 box. A bright core
 * scales up and fades, with a slower outer ring expanding behind it. Built
 * from two layered absolutely-positioned circles so we don't need Skia.
 */
export function BoxBurst({ boxIndex, cellSize, reducedMotion }: Props) {
  const boxCol = boxIndex % 3;
  const boxRow = Math.floor(boxIndex / 3);
  const left = boxCol * 3 * cellSize;
  const top = boxRow * 3 * cellSize;
  const size = cellSize * 3;

  const wash = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const coreScale = useSharedValue(0.4);
  const coreOpacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      wash.value = withSequence(
        withTiming(0.6, { duration: 80, easing: Easing.linear }),
        withTiming(0, { duration: 260, easing: Easing.linear }),
      );
      coreOpacity.value = withSequence(
        withTiming(0.5, { duration: 60 }),
        withTiming(0, { duration: 240 }),
      );
      coreScale.value = 1;
      return;
    }
    wash.value = withSequence(
      withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }),
    );
    ringOpacity.value = withSequence(
      withTiming(0.85, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
    );
    ringScale.value = withTiming(1.35, {
      duration: 520,
      easing: Easing.bezier(0.2, 0, 0.2, 1),
    });
    coreOpacity.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
    );
    coreScale.value = withTiming(0.85, {
      duration: 410,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [reducedMotion, wash, ringScale, ringOpacity, coreScale, coreOpacity]);

  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.boxBox,
        { left, top, width: size, height: size },
      ]}
    >
      <Animated.View
        style={[styles.wash, { backgroundColor: colors.cellSameNumber }, washStyle]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: size * 0.95, height: size * 0.95, borderRadius: size },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          { width: size * 0.55, height: size * 0.55, borderRadius: size },
          coreStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boxBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  wash: { ...StyleSheet.absoluteFillObject },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accentGoldGlow,
    backgroundColor: 'transparent',
  },
  core: {
    position: 'absolute',
    backgroundColor: colors.accentGoldGlow,
    shadowColor: colors.accentGoldGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
});
