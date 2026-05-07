import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/profile/Avatar';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useCountdown } from '@/hooks/useCountdown';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  shadows,
  spacing,
} from '@/theme';
import type { Profile } from '@/services/supabase';

export type ChallengeCardStatus =
  | 'incoming-pending'
  | 'incoming-accepted'
  | 'outgoing-pending'
  | 'completed-won'
  | 'completed-lost'
  | 'completed-draw'
  | 'expired';

interface Props {
  status: ChallengeCardStatus;
  challenger: Profile | null;
  opponent: Profile | null;
  modeLabel: string;
  expiresAt?: string | null;
  onPress?: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export function ChallengeCard({
  status,
  challenger,
  opponent,
  modeLabel,
  expiresAt,
  onPress,
  onSecondary,
  primaryLabel,
  secondaryLabel,
}: Props) {
  const countdown = useCountdown(expiresAt);
  const tone = toneFor(status);

  return (
    <GlassCard
      style={[
        styles.card,
        { borderColor: tone.border },
        tone.glow as object,
      ]}
    >
      <View style={styles.duel}>
        <View style={styles.duelSide}>
          <Avatar
            size="md"
            url={challenger?.avatar_url ?? null}
            fallbackName={challenger?.display_name ?? challenger?.username}
          />
          <Text style={styles.duelName} numberOfLines={1}>
            {challenger?.display_name ?? challenger?.username ?? '—'}
          </Text>
        </View>
        <Text style={styles.versus}>vs</Text>
        <View style={styles.duelSide}>
          <Avatar
            size="md"
            url={opponent?.avatar_url ?? null}
            fallbackName={opponent?.display_name ?? opponent?.username}
          />
          <Text style={styles.duelName} numberOfLines={1}>
            {opponent?.display_name ?? opponent?.username ?? '—'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.mode}>{modeLabel}</Text>
        <Text style={[styles.countdown, { color: tone.timeColor }]}>
          {tone.timeLabel ?? (expiresAt ? countdown.formatted : '')}
        </Text>
      </View>

      {(primaryLabel || secondaryLabel) ? (
        <View style={styles.actionsRow}>
          {secondaryLabel && onSecondary ? (
            <PremiumButton
              label={secondaryLabel}
              variant="ghost"
              compact
              onPress={onSecondary}
            />
          ) : null}
          {primaryLabel && onPress ? (
            <PremiumButton
              label={primaryLabel}
              variant={tone.primaryVariant}
              compact
              onPress={onPress}
            />
          ) : null}
        </View>
      ) : null}
    </GlassCard>
  );
}

function toneFor(status: ChallengeCardStatus): {
  border: string;
  glow: object;
  timeColor: string;
  timeLabel?: string;
  primaryVariant: 'primary' | 'secondary' | 'ghost';
} {
  if (status === 'incoming-pending' || status === 'incoming-accepted') {
    return {
      border: colors.accentGold,
      glow: shadows.goldGlow,
      timeColor: colors.accentGold,
      primaryVariant: 'primary',
    };
  }
  if (status === 'outgoing-pending') {
    return {
      border: colors.glassBorder,
      glow: {},
      timeColor: colors.textMuted,
      primaryVariant: 'ghost',
    };
  }
  if (status === 'completed-won') {
    return {
      border: colors.success,
      glow: { shadowColor: colors.successGlow, shadowOpacity: 0.5, shadowRadius: 14 },
      timeColor: colors.success,
      timeLabel: 'You won',
      primaryVariant: 'ghost',
    };
  }
  if (status === 'completed-lost') {
    return {
      border: colors.divider,
      glow: {},
      timeColor: colors.textMuted,
      timeLabel: 'You lost',
      primaryVariant: 'ghost',
    };
  }
  if (status === 'completed-draw') {
    return {
      border: colors.divider,
      glow: {},
      timeColor: colors.textMuted,
      timeLabel: 'Draw',
      primaryVariant: 'ghost',
    };
  }
  return {
    border: colors.divider,
    glow: {},
    timeColor: colors.textDim,
    timeLabel: 'Expired',
    primaryVariant: 'ghost',
  };
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  duel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  duelSide: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
  },
  duelName: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  versus: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
    paddingHorizontal: spacing.sm,
    textShadowColor: colors.accentGoldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mode: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
  countdown: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
