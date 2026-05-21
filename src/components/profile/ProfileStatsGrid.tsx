/**
 * ProfileStatsGrid
 *
 * Mirrors `web/src/components/profile/PublicStatsGrid.tsx` — a 3×2 grid
 * of headline stats with display-font values and a small uppercase
 * tracking-wider label. Gold accent on XP + Crowns (the two stats
 * worth bragging about). Tabular nums so multi-digit values line up
 * vertically across the rows.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { formatTime } from '@/utils/formatTime';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';

export interface ProfileStatsGridProps {
  xp: number;
  levelsCleared: number;
  starsTotal: number;
  crownsTotal: number;
  /** Best Sprint score (stored in `profiles.best_time_trial_score`),
   *  rendered as a number with comma separators. */
  bestTimeTrialScore: number;
  /** ISO timestamp from `profiles.created_at`. */
  createdAt: string;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Best-sprint historically stored as raw score, not duration ms.
 *  Render as a plain number; if it ever turns out to be a duration we
 *  can swap in `formatTime`. */
function fmtBestSprint(n: number): string {
  if (!n || n <= 0) return '—';
  return fmt(n);
}

export function ProfileStatsGrid({
  xp,
  levelsCleared,
  starsTotal,
  crownsTotal,
  bestTimeTrialScore,
  createdAt,
}: ProfileStatsGridProps) {
  const cells = [
    { label: 'XP', value: fmt(xp), gold: true },
    { label: 'Levels cleared', value: fmt(levelsCleared), gold: false },
    { label: 'Stars earned', value: fmt(starsTotal), gold: false },
    { label: 'Crowns', value: fmt(crownsTotal), gold: true },
    { label: 'Best Sprint', value: fmtBestSprint(bestTimeTrialScore), gold: false },
    { label: 'Joined', value: fmtMonthYear(createdAt), gold: false },
  ];

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.eyebrow}>STATS</Text>
      <View style={styles.grid}>
        {cells.map((c) => (
          <View key={c.label} style={styles.cell}>
            <Text
              style={[styles.value, c.gold ? styles.valueGold : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {c.value}
            </Text>
            <Text style={styles.label}>{c.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

// Silence unused-import lint without removing the import — we keep it
// available for future "Best Sprint as duration" toggle.
void formatTime;

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
    marginBottom: spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
  },
  cell: {
    // 3-up grid on phones. width:33% with no horizontal margin keeps
    // the columns even.
    width: '33.33%',
    paddingRight: spacing.sm,
  },
  value: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    // tabular-nums equivalent — RN doesn't expose it directly via
    // styles, but using the display font (Cinzel) gives consistent
    // glyph widths for digits in our setup.
  },
  valueGold: {
    color: colors.accentGold,
    textShadowColor: colors.accentGoldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  label: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
});
