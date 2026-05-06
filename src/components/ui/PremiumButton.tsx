import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
import { audioService } from '@/services/audio/audioService';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Smaller height for in-line use. */
  compact?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function PremiumButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  leadingIcon,
  trailingIcon,
  compact = false,
  accessibilityLabel,
  accessibilityHint,
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
    if (disabled) return;
    hapticsService.light();
    if (variant === 'primary') audioService.playButtonPrimary();
    else audioService.playButtonSecondary();
    onPress();
  };

  const palette = paletteFor(variant, disabled);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          compact && styles.compact,
          palette.background,
          palette.border,
          variant === 'primary' && !disabled && (shadows.goldGlow as ViewStyle),
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.row}>
          {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
          <Text style={[styles.label, palette.label, compact && styles.labelCompact]}>
            {label}
          </Text>
          {trailingIcon ? <View style={styles.icon}>{trailingIcon}</View> : null}
        </View>
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
  compact: {
    height: 44,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  labelCompact: {
    fontSize: fontSize.sm,
  },
});
