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

interface OpponentRailProps {
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  /** 0-100 progress through the puzzle. */
  progressPercent: number;
  /** Latest opponent score (current_score column). */
  score: number;
  /** {rows, cols, boxes} aggregated counts. */
  completedUnits?: { rows?: number; cols?: number; boxes?: number };
  /** Has the opponent submitted their final attempt? */
  finished?: boolean;
  /** Has the opponent been silent past the disconnect threshold? */
  reconnecting?: boolean;
}

/**
 * Slim opponent rail rendered above the player's board. Intentionally
 * spartan — we never show the opponent's actual board, just enough state
 * to know whether they're ahead, behind, or done. The "completed a box"
 * pulse is a soft style change driven by `completedUnits` deltas, kept
 * minimal so it doesn't pull eyes off the player's board.
 */
export function OpponentRail({
  displayName,
  avatarUrl,
  username,
  progressPercent,
  score,
  completedUnits,
  finished,
  reconnecting,
}: OpponentRailProps) {
  const safePct = Math.max(0, Math.min(100, progressPercent));
  const totalRegions =
    (completedUnits?.rows ?? 0) +
    (completedUnits?.cols ?? 0) +
    (completedUnits?.boxes ?? 0);

  return (
    <View
      style={[styles.rail, finished && styles.railFinished]}
      accessibilityLabel={`Opponent ${displayName ?? username ?? 'unknown'}, ${safePct.toFixed(0)} percent, score ${score}`}
    >
      <Avatar
        size="sm"
        url={avatarUrl}
        fallbackName={displayName ?? username ?? 'Rival'}
      />
      <View style={styles.midColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName ?? (username ? `@${username}` : 'Rival')}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${safePct}%` }]}
          />
        </View>
        <Text style={styles.regions}>{totalRegions} regions</Text>
      </View>
      <View style={styles.scoreColumn}>
        {finished ? (
          <Text style={styles.finishedBadge}>FINISHED</Text>
        ) : reconnecting ? (
          <Text style={styles.reconnectBadge}>Reconnecting…</Text>
        ) : null}
        <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
        <Text style={styles.scoreLabel}>score</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  railFinished: {
    borderColor: colors.accentGold,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  midColumn: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.accentGold,
    borderRadius: 2,
  },
  regions: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  scoreColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreValue: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  scoreLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  finishedBadge: {
    color: colors.accentGold,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
  },
  reconnectBadge: {
    color: colors.warning,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.semibold,
  },
});
