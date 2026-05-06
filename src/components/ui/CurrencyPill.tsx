import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface Props {
  label: string;
  value: number | string;
  icon?: string;
}

export function CurrencyPill({ label, value, icon = '✦' }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.text}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  icon: {
    color: colors.accentGold,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  text: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
  },
});
