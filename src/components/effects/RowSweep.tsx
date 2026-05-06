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
  /** 0..8 — which row was completed. */
  rowIndex: number;
  /** Per-cell pixel size of the board. */
  cellSize: number;
  /** Total inner pixel width of the board grid (== cellSize · 9). */
  boardSize: number;
  /** Driven by Settings → Reduced Motion. When true we render a soft static
   *  flash instead of an animated sweep. */
  reducedMotion?: boolean;
}

/**
 * Horizontal light sweep across a completed row. A bright gold "head" with
 * a long fading trail glides left → right, then fades. Built with
 * Reanimated 4 worklet shared-values so the animation runs entirely on the
 * UI thread (60fps even when the board is re-rendering placements).
 *
 * Visual recipe (no Skia required):
 *   • absolute-positioned strip the height of one row, full board width
 *   • child `Animated.View` shaped as a horizontal "comet" (a wide
 *     rectangle with rounded edges + soft shadow), translated from
 *     `-headWidth` to `boardSize + headWidth` over `sweepDuration`
 *   • the strip itself fades opacity 0 → 1 → 0
 */
export function RowSweep({ rowIndex, cellSize, boardSize, reducedMotion }: Props) {
  const headWidth = Math.max(48, cellSize * 1.4);
  const stripOpacity = useSharedValue(0);
  const headX = useSharedValue(-headWidth);

  useEffect(() => {
    if (reducedMotion) {
      stripOpacity.value = withSequence(
        withTiming(0.55, { duration: 80, easing: Easing.linear }),
        withTiming(0, { duration: 220, easing: Easing.linear }),
      );
      headX.value = boardSize / 2 - headWidth / 2;
      return;
    }
    stripOpacity.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
    );
    headX.value = withTiming(boardSize + headWidth, {
      duration: 420,
      easing: Easing.bezier(0.2, 0, 0.2, 1),
    });
  }, [reducedMotion, stripOpacity, headX, boardSize, headWidth]);

  const stripStyle = useAnimatedStyle(() => ({ opacity: stripOpacity.value }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: headX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.strip,
        {
          top: rowIndex * cellSize,
          width: boardSize,
          height: cellSize,
        },
        stripStyle,
      ]}
    >
      <View style={[styles.bgWash, { backgroundColor: colors.cellSelected }]} />
      <Animated.View
        style={[
          styles.head,
          {
            width: headWidth,
            height: cellSize,
          },
          headStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  bgWash: {
    ...StyleSheet.absoluteFillObject,
  },
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
