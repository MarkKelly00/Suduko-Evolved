import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/profile/Avatar';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { RankBadge } from './RankBadge';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  shadows,
  spacing,
} from '@/theme';
import { formatTime } from '@/utils/formatTime';

export interface LeaderboardRowData {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  timeMs: number | null;
  crown?: boolean;
}

interface Props {
  row: LeaderboardRowData;
  isCurrentUser: boolean;
  onPress?: () => void;
  /** Renders a "Challenge" CTA at the right (Friends tab). */
  onChallenge?: () => void;
}

export function LeaderboardRow({ row, isCurrentUser, onPress, onChallenge }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <GlassCard
        flat
        style={[
          styles.card,
          isCurrentUser && {
            borderColor: colors.accentGold,
            ...(shadows.goldGlow as object),
          },
        ]}
      >
        <View style={styles.row}>
          <RankBadge rank={row.rank} />
          <Avatar size="md" url={row.avatarUrl} fallbackName={row.displayName ?? row.username} />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {row.displayName ?? row.username ?? 'Sudoku player'}
            </Text>
            {row.username ? (
              <Text style={styles.handle} numberOfLines={1}>
                {`@${row.username}`}
              </Text>
            ) : null}
          </View>
          <View style={styles.scoreCol}>
            <View style={styles.scoreLine}>
              {row.crown ? <Text style={styles.crown}></Text> : null}
              <Text style={styles.score}>{formatScore(row.score)}</Text>
            </View>
            <Text style={styles.time}>
              {row.timeMs != null ? formatTime(row.timeMs) : ''}
            </Text>
          </View>
          {onChallenge && !isCurrentUser ? (
            <View style={styles.actionWrap}>
              <PremiumButton
                label="Challenge"
                variant="ghost"
                compact
                onPress={onChallenge}
              />
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

function formatScore(n: number): string {
  if (n < 1000) return n.toString();
  return n.toLocaleString();
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  scoreCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  score: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  crown: {
    color: colors.accentGold,
    fontSize: fontSize.sm,
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.mono,
  },
  actionWrap: {
    minWidth: 90,
  },
});
