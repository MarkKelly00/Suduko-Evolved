import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, fontWeight } from '@/theme';

interface Props {
  rank: number;
}

const SILVER = '#C0C8D8';
const BRONZE = '#C58A4A';

export function RankBadge({ rank }: Props) {
  const isPodium = rank >= 1 && rank <= 3;
  const fill =
    rank === 1 ? colors.accentGold : rank === 2 ? SILVER : rank === 3 ? BRONZE : 'transparent';
  const border =
    rank === 1
      ? colors.accentGoldGlow
      : rank === 2
        ? '#E2E7F0'
        : rank === 3
          ? '#E5B57F'
          : colors.accentGold;
  const textColor = isPodium ? colors.textOnGold : colors.accentGold;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: fill,
          borderColor: border,
          borderWidth: isPodium ? 1 : 1.5,
        },
        isPodium && {
          shadowColor: colors.accentGoldGlow,
          shadowOpacity: 0.5,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
  },
});
