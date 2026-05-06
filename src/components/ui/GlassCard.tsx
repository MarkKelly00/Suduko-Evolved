import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use a subtler treatment (no shadow, lighter border). */
  flat?: boolean;
}

export function GlassCard({ children, style, flat = false }: Props) {
  return (
    <View style={[styles.base, !flat && (shadows.card as ViewStyle), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.base,
  },
});
