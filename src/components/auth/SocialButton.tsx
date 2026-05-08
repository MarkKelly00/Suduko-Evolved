import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  duration,
  easing,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadows,
  spacing,
} from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Provider mark rendered as a leading icon — usually a small <Text> glyph. */
  leadingIcon?: React.ReactNode;
}

/**
 * Auth-flavoured button. Mirrors PremiumButton's animation/haptics so the
 * auth modal feels of-a-piece, but renders a spinner when loading and
 * supports a leading icon slot for provider marks.
 */
export function SocialButton({
  label,
  onPress,
  variant = 'secondary',
  loading = false,
  disabled = false,
  leadingIcon,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: duration.fast, easing: easing.standard });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: duration.fast, easing: easing.standard });
  };
  const handlePress = () => {
    if (disabled || loading) return;
    hapticsService.light();
    onPress();
  };

  const palette = paletteFor(variant, disabled || loading);

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        accessibilityLabel={label}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.base,
          palette.background,
          palette.border,
          variant === 'primary' && !disabled && (shadows.goldGlow as object),
        ]}
      >
        {loading ? (
          // Centered spinner — replace icon + label entirely while loading
          // so the layout doesn't get pulled off-center.
          <ActivityIndicator color={palette.label.color} />
        ) : (
          <View style={styles.row}>
            {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
            <Text style={[styles.label, palette.label]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function paletteFor(variant: Variant, disabled: boolean) {
  if (disabled) {
    return {
      background: { backgroundColor: colors.surfacePressed },
      border: { borderColor: colors.divider, borderWidth: 1 },
      label: { color: colors.textDim },
    };
  }
  if (variant === 'primary') {
    return {
      background: { backgroundColor: colors.accentGold },
      border: { borderColor: colors.accentGoldGlow, borderWidth: 1 },
      label: { color: colors.textOnGold },
    };
  }
  if (variant === 'secondary') {
    return {
      background: { backgroundColor: colors.surfaceElevated },
      border: { borderColor: colors.glassBorder, borderWidth: 1 },
      label: { color: colors.text },
    };
  }
  return {
    background: { backgroundColor: 'transparent' },
    border: { borderColor: colors.glassBorder, borderWidth: 1 },
    label: { color: colors.text },
  };
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
});
