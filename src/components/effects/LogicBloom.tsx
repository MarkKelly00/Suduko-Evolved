import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';

interface Props {
  /** Outer board pixel size (== cellSize · 9). */
  boardSize: number;
  reducedMotion?: boolean;
}

/**
 * Full-board cinematic when the puzzle is solved. A bright core blooms
 * from the board center; a wide outer ring expands beyond the board; an
 * overall gold wash sweeps the grid. Three cascaded animation timelines
 * give it a "controlled storm" feel without requiring particle systems.
 */
export function LogicBloom({ boardSize, reducedMotion }: Props) {
  const wash = useSharedValue(0);
  const innerScale = useSharedValue(0.2);
  const innerOpacity = useSharedValue(0);
  const outerScale = useSharedValue(0.4);
  const outerOpacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      wash.value = withSequence(
        withTiming(0.5, { duration: 120 }),
        withTiming(0, { duration: 480 }),
      );
      return;
    }
    wash.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withDelay(80, withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) })),
    );
    innerOpacity.value = withSequence(
      withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) }),
    );
    innerScale.value = withTiming(1.4, {
      duration: 700,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    outerOpacity.value = withSequence(
      withDelay(80, withTiming(0.85, { duration: 160, easing: Easing.out(Easing.quad) })),
      withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
    );
    outerScale.value = withTiming(1.65, {
      duration: 850,
      easing: Easing.bezier(0.2, 0, 0.2, 1),
    });
  }, [reducedMotion, wash, innerScale, innerOpacity, outerScale, outerOpacity]);

  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  const innerStyle = useAnimatedStyle(() => ({
    opacity: innerOpacity.value,
    transform: [{ scale: innerScale.value }],
  }));
  const outerStyle = useAnimatedStyle(() => ({
    opacity: outerOpacity.value,
    transform: [{ scale: outerScale.value }],
  }));

  const inner = boardSize * 0.45;
  const outer = boardSize * 0.95;

  return (
    <View
      pointerEvents="none"
      style={[styles.canvas, { width: boardSize, height: boardSize }]}
    >
      <Animated.View style={[styles.wash, washStyle]} />
      <Animated.View
        style={[
          styles.ring,
          { width: outer, height: outer, borderRadius: boardSize },
          outerStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          { width: inner, height: inner, borderRadius: boardSize },
          innerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cellSelected,
  },
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
    shadowRadius: 32,
  },
});
