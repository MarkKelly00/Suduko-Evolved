import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight } from '@/theme';

interface Props {
  /** 0-3 stars filled. */
  stars: 0 | 1 | 2 | 3;
  size?: number;
  /** Show three star slots even when 0 (greyed-out). */
  showEmpty?: boolean;
  /** Premium 3-star clears earn a crown indicator. */
  crown?: boolean;
}

export function StarRating({ stars, size = 24, showEmpty = true, crown = false }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`${stars} of 3 stars${crown ? ', crown' : ''}`}>
      {[1, 2, 3].map((i) => {
        const filled = i <= stars;
        if (!filled && !showEmpty) return null;
        return (
          <Text
            key={i}
            style={[
              styles.star,
              { fontSize: size },
              filled ? styles.filled : styles.empty,
            ]}
          >
            {'★'}
          </Text>
        );
      })}
      {crown ? <Text style={[styles.crown, { fontSize: size }]}>{'♛'}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    fontWeight: fontWeight.bold,
  },
  filled: {
    color: colors.accentGold,
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  empty: {
    color: colors.divider,
  },
  crown: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.lg,
    marginLeft: 6,
    textShadowColor: colors.accentGold,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
});
