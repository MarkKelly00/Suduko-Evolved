import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StarRating } from '@/components/ui/StarRating';
import {
  colors,
  duration,
  easing,
  fontSize,
  fontWeight,
  shadows,
} from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';

export type LevelNodeState = 'locked' | 'unlocked' | 'current' | 'completed';

interface Props {
  index: number;
  state: LevelNodeState;
  stars?: 0 | 1 | 2 | 3;
  crown?: boolean;
  onPress: () => void;
  size?: number;
}

/**
 * Single level node on the saga map. Phase 3 = Views + Reanimated for press
 * + locked-shake feedback. Phase 4 will swap the inner disc to a Skia render
 * with breathing glow + ambient particles.
 */
export function LevelNode({
  index,
  state,
  stars = 0,
  crown = false,
  onPress,
  size = 64,
}: Props) {
  const offsetX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  const handlePress = () => {
    if (state === 'locked') {
      hapticsService.warning();
      offsetX.value = withSequence(
        withTiming(-6, { duration: duration.fast, easing: easing.standard }),
        withTiming(6, { duration: duration.fast, easing: easing.standard }),
        withTiming(0, { duration: duration.fast, easing: easing.standard }),
      );
      return;
    }
    hapticsService.selection();
    onPress();
  };

  const palette = paletteFor(state);

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={describe(index, state, stars, crown)}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.outer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: palette.border,
            backgroundColor: palette.fill,
          },
          state === 'current' && (shadows.goldGlow as ViewStyle),
          state === 'completed' && (shadows.successGlow as ViewStyle),
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.indexText, { color: palette.text }]}>{index}</Text>
      </Pressable>
      <View style={styles.starWrap}>
        <StarRating stars={stars} size={12} crown={crown} showEmpty={state === 'completed'} />
      </View>
    </Animated.View>
  );
}

function paletteFor(state: LevelNodeState): { fill: string; border: string; text: string } {
  switch (state) {
    case 'locked':
      return {
        fill: colors.nodeLocked,
        border: colors.divider,
        text: colors.textDim,
      };
    case 'unlocked':
      return {
        fill: colors.nodeUnlocked,
        border: colors.boardLineBold,
        text: colors.text,
      };
    case 'current':
      return {
        fill: colors.accentGold,
        border: colors.accentGoldGlow,
        text: colors.textOnGold,
      };
    case 'completed':
      return {
        fill: colors.surface,
        border: colors.success,
        text: colors.success,
      };
  }
}

function describe(index: number, state: LevelNodeState, stars: number, crown: boolean): string {
  const base = `Level ${index}`;
  if (state === 'locked') return `${base}, locked`;
  if (state === 'current') return `${base}, current`;
  if (state === 'completed') {
    return `${base}, completed${stars ? `, ${stars} stars` : ''}${crown ? ', crown' : ''}`;
  }
  return `${base}, unlocked`;
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  indexText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  starWrap: {
    position: 'absolute',
    bottom: -16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
