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
  /** 0..8 — which column was completed. */
  colIndex: number;
  cellSize: number;
  boardSize: number;
  reducedMotion?: boolean;
}

/**
 * Vertical light beam down a completed column. Mirror of {@link RowSweep}
 * rotated 90°: a tall strip the width of one column, with a bright "head"
 * that travels top → bottom while the column tints briefly.
 */
export function ColumnBeam({ colIndex, cellSize, boardSize, reducedMotion }: Props) {
  const headHeight = Math.max(48, cellSize * 1.4);
  const stripOpacity = useSharedValue(0);
  const headY = useSharedValue(-headHeight);

  useEffect(() => {
    if (reducedMotion) {
      stripOpacity.value = withSequence(
        withTiming(0.55, { duration: 80, easing: Easing.linear }),
        withTiming(0, { duration: 220, easing: Easing.linear }),
      );
      headY.value = boardSize / 2 - headHeight / 2;
      return;
    }
    stripOpacity.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
    );
    headY.value = withTiming(boardSize + headHeight, {
      duration: 420,
      easing: Easing.bezier(0.2, 0, 0.2, 1),
    });
  }, [reducedMotion, stripOpacity, headY, boardSize, headHeight]);

  const stripStyle = useAnimatedStyle(() => ({ opacity: stripOpacity.value }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.strip,
        {
          left: colIndex * cellSize,
          width: cellSize,
          height: boardSize,
        },
        stripStyle,
      ]}
    >
      <View style={[styles.bgWash, { backgroundColor: colors.cellSelected }]} />
      <Animated.View
        style={[
          styles.head,
          {
            width: cellSize,
            height: headHeight,
          },
          headStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: { position: 'absolute', top: 0, overflow: 'hidden' },
  bgWash: { ...StyleSheet.absoluteFillObject },
  head: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.accentGoldGlow,
    borderRadius: 999,
    shadowColor: colors.accentGoldGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
});
