import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/profile/Avatar';
import { CurrencyPill } from '@/components/ui/CurrencyPill';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Profile } from '@/services/supabase';

interface Props {
  profile: Profile;
  onPress?: () => void;
  /** Action button on the right. Use null to hide. */
  action?: {
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    onPress: () => void;
  } | null;
}

export function FriendListItem({ profile, onPress, action }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={profile.display_name ?? profile.username ?? 'Friend'}
    >
      <GlassCard flat style={styles.card}>
        <View style={styles.row}>
          <Avatar
            size="md"
            url={profile.avatar_url}
            fallbackName={profile.display_name ?? profile.username}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.display_name ?? profile.username ?? 'Sudoku player'}
            </Text>
            {profile.username ? (
              <Text style={styles.handle} numberOfLines={1}>
                {`@${profile.username}`}
              </Text>
            ) : null}
            <View style={styles.pillsRow}>
              <CurrencyPill label="XP" value={profile.xp} icon="" />
              {profile.streak > 0 ? (
                <CurrencyPill label="streak" value={profile.streak} icon="" />
              ) : null}
            </View>
          </View>
          {action ? (
            <View style={styles.actionWrapper}>
              <PremiumButton
                label={action.label}
                variant={action.variant ?? 'ghost'}
                compact
                disabled={action.disabled}
                onPress={action.onPress}
              />
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  info: {
    flex: 1,
    // Slightly looser vertical rhythm than the original gap=2 — gives
    // the display name + handle + pills row room to breathe. Especially
    // matters for profiles without a @handle (e.g. brand-new accounts)
    // where only two tiers stack and the column previously read as
    // cramped.
    gap: 4,
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
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    // marginTop dropped — `info.gap` now controls spacing above this
    // row, keeping the cadence consistent whether or not a @handle
    // is present.
    marginTop: 2,
  },
  actionWrapper: {
    minWidth: 90,
  },
});
