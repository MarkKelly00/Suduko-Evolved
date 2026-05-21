/**
 * ProfileHeaderCard
 *
 * Mirrors `web/src/components/profile/PublicProfileHeader.tsx` so the
 * in-app friend / own profile experience reads as polished as the
 * `/u/<handle>` web page.
 *
 * Layout: avatar on the left (lg, gold ring already built into the
 * Avatar primitive), display name + @handle stacked on the right,
 * with two small chips below — crown total + streak.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/profile/Avatar';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

export interface ProfileHeaderCardProps {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  crownsTotal: number;
  streak: number;
}

export function ProfileHeaderCard({
  displayName,
  username,
  avatarUrl,
  crownsTotal,
  streak,
}: ProfileHeaderCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Avatar size="lg" url={avatarUrl} fallbackName={displayName} />
        <View style={styles.textCol}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          {username ? (
            <Text style={styles.handle} numberOfLines={1}>
              {`@${username}`}
            </Text>
          ) : null}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipIcon}>♛</Text>
              <Text style={styles.chipValue}>{crownsTotal}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipFlame}>🔥</Text>
              <Text style={styles.chipValue}>{streak}</Text>
              <Text style={styles.chipLabel}>day streak</Text>
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Slightly more padding than default for "Apple-esque" generosity.
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  textCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  displayName: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textShadowColor: 'rgba(245,213,138,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  handle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wide,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipIcon: {
    color: colors.accentGold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  chipFlame: {
    fontSize: fontSize.xs,
  },
  chipValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wide,
  },
});
