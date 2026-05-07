import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  duration,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
} from '@/theme';
import { useSettingsStore } from '@/game/state/useSettingsStore';

type Variant = 'error' | 'success' | 'info';

interface Props {
  variant?: Variant;
  message: string;
  /** Resets the entrance animation when this changes; useful for repeat errors. */
  nonce?: number | string;
}

/**
 * Small inline toast for auth + form feedback. Doesn't auto-dismiss — owner
 * controls visibility by mounting/unmounting. Uses the existing motion system
 * and respects reduced-motion.
 */
export function InlineToast({ variant = 'info', message, nonce }: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reducedMotion ? 0 : 6);

  useEffect(() => {
    const d = reducedMotion ? 0 : duration.base;
    opacity.value = withTiming(1, { duration: d, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: d, easing: Easing.out(Easing.quad) });
  }, [opacity, translateY, reducedMotion, nonce]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const palette = paletteFor(variant);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: palette.background, borderColor: palette.border },
        variant !== 'info' && (palette.shadow as object),
        animatedStyle,
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </Animated.View>
  );
}

function paletteFor(variant: Variant) {
  if (variant === 'error') {
    return {
      background: 'rgba(229, 72, 77, 0.10)',
      border: colors.mistake,
      dot: colors.mistakeGlow,
      text: colors.text,
      shadow: { shadowColor: colors.mistakeGlow, shadowOpacity: 0.5, shadowRadius: 14 },
    };
  }
  if (variant === 'success') {
    return {
      background: 'rgba(91, 214, 168, 0.10)',
      border: colors.success,
      dot: colors.successGlow,
      text: colors.text,
      shadow: { shadowColor: colors.successGlow, shadowOpacity: 0.45, shadowRadius: 12 },
    };
  }
  return {
    background: colors.surface,
    border: colors.glassBorder,
    dot: colors.textMuted,
    text: colors.text,
    shadow: shadows.card,
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm * 1.35,
  },
});
