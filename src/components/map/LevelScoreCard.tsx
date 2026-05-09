/**
 * LevelScoreCard
 *
 * Layout primitive shared by every score card in the LevelPreviewModal:
 * "Your Best", "Friend Best", "Global Best". Renders a glass-bordered card
 * with an uppercase eyebrow + (optional) avatar slot + body content +
 * stars/crown badge. Body content is composed by the caller so the
 * card stays generic. Polished empty states are also handled here so
 * each card-type doesn't reinvent the wheel.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Avatar } from '@/components/profile/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

type AccentTone = 'gold' | 'cyan' | 'navy';

interface Props {
  eyebrow: string;
  /** Right-aligned hint line (e.g. "Top 10 globally"). Optional. */
  eyebrowAccessory?: string;
  /** Big primary title — typically a player display name. */
  title?: string;
  /** Secondary line under the title (handle, time, etc). */
  subtitle?: string;
  /** Avatar URL — when present, an avatar is rendered to the left of the title. */
  avatarUrl?: string;
  /** Used as the avatar fallback. */
  fallbackName?: string;
  /** Right-rail score number. Skip to omit. */
  score?: number;
  /** Right-rail time below score (formatted by caller). */
  timeLabel?: string;
  /** 0-3, optional — when set, renders inline in the right rail. */
  stars?: 0 | 1 | 2 | 3;
  crown?: boolean;
  /** Body slot for cards that need extra content (mistakes/hints, etc). */
  children?: ReactNode;
  /** When true, the card uses the celebratory accent (gold ring + glow). */
  isHighlight?: boolean;
  /** Tints the eyebrow + ring accent. */
  accent?: AccentTone;
  style?: ViewStyle | ViewStyle[];
}

const ACCENT_COLOR: Record<AccentTone, string> = {
  gold: colors.accentGold,
  cyan: colors.accentTeal,
  navy: colors.textMuted,
};

export function LevelScoreCard({
  eyebrow,
  eyebrowAccessory,
  title,
  subtitle,
  avatarUrl,
  fallbackName,
  score,
  timeLabel,
  stars,
  crown,
  children,
  isHighlight = false,
  accent = 'navy',
  style,
}: Props) {
  const accentColor = ACCENT_COLOR[accent];
  return (
    <View
      style={[
        styles.card,
        isHighlight && styles.cardHighlight,
        style,
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.eyebrowRow}>
        <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
        {eyebrowAccessory ? (
          <Text style={styles.eyebrowAccessory}>{eyebrowAccessory}</Text>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.identity}>
          {avatarUrl !== undefined ? (
            <Avatar size="md" url={avatarUrl || undefined} fallbackName={fallbackName ?? null} />
          ) : null}
          <View style={styles.identityText}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {score !== undefined || timeLabel !== undefined ? (
          <View style={styles.scoreColumn}>
            {score !== undefined ? (
              <Text style={styles.score} numberOfLines={1}>
                {score.toLocaleString('en-US')}
              </Text>
            ) : null}
            {timeLabel ? (
              <Text style={styles.time} numberOfLines={1}>
                {timeLabel}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {(stars !== undefined && stars > 0) || crown ? (
        <View style={styles.starRow}>
          <StarRating
            stars={stars ?? 0}
            crown={crown ?? false}
            size={18}
            showEmpty={false}
          />
        </View>
      ) : null}
      {children ? <View style={styles.extras}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  cardHighlight: {
    borderColor: 'rgba(224,185,106,0.35)',
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  eyebrowAccessory: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wide,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
    marginTop: 2,
  },
  scoreColumn: {
    alignItems: 'flex-end',
  },
  score: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  extras: {
    marginTop: spacing.xs,
  },
});
