import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/profile/Avatar';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { formatDuration } from '@/utils/formatTime';

interface Props {
  challengerName: string;
  challengerAvatarUrl: string | null;
  challengerScore: number;
  challengerTimeSeconds: number;
}

/**
 * Tiny strip rendered above gameplay when the player is responding to a
 * friend challenge. Reminds them what they're trying to beat.
 */
export function ChallengeBanner({
  challengerName,
  challengerAvatarUrl,
  challengerScore,
  challengerTimeSeconds,
}: Props) {
  return (
    <View style={styles.container}>
      <Avatar size="sm" url={challengerAvatarUrl} fallbackName={challengerName} />
      <View style={styles.text}>
        <Text style={styles.eyebrow}>CHALLENGE</Text>
        <Text style={styles.target} numberOfLines={1}>
          Beat {challengerName}: {challengerScore.toLocaleString()} ·{' '}
          {formatDuration(challengerTimeSeconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentGold,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  text: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accentGold,
    fontSize: 9,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
  },
  target: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.semibold,
  },
});
