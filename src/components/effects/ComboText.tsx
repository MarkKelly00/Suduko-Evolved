import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontFamily, fontSize, fontWeight, letterSpacing } from '@/theme';

interface Props {
  /** Single line of premium-game-style copy: "Logic Cascade", "Box Burst",
   *  "Perfect Harmony", "Logic Bloom" — chosen by the orchestrator. */
  label: string;
  /** Outer board pixel size — the chip centers itself in the middle. */
  boardSize: number;
  reducedMotion?: boolean;
}

/**
 * Floating combo / completion label. Pops in with a tiny pop, lingers,
 * fades upward. Stays on top of the other VFX so the player always sees
 * the name of what just happened.
 */
export function ComboText({ label, boardSize, reducedMotion }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const offsetY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: 600 }),
      );
      scale.value = 1;
      return;
    }
    opacity.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }),
    );
    scale.value = withSequence(
      withTiming(1.08, { duration: 180, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
    );
    offsetY.value = withTiming(-22, { duration: 700, easing: Easing.out(Easing.quad) });
  }, [label, reducedMotion, opacity, scale, offsetY]);

  const chipStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: offsetY.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.center, { width: boardSize, height: boardSize }]}
    >
      <Animated.View style={[styles.chip, chipStyle]}>
        <Text style={styles.chipText}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentGold,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: colors.accentGoldGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  chipText: {
    color: colors.accentGoldGlow,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
});
