/**
 * ProfileRecentSolvesList
 *
 * Mirrors `web/src/components/profile/PublicRecentScores.tsx`. Renders
 * a divided list of up to N recent best_level_scores for a user, with:
 *   - left:  L23 (primary) + "Oracle Bloom · May 19" (subtitle)
 *   - right: ★★★ + 👑 + 4,222
 *
 * Humanises `world1-level-23` → "L23" + biome label via WORLD_1_ACTS,
 * matching the leaderboard biome grouping pattern.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import type { RecentSolve } from '@/services/supabase/profileService';
import { WORLD_1_ACTS } from '@/components/map/mapLayout';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';

interface ProfileRecentSolvesListProps {
  solves: RecentSolve[];
}

/** Parse the trailing integer out of `world1-level-23` → 23. Returns
 *  null if the id doesn't match the expected pattern. */
function parseLevelIndex(levelId: string): number | null {
  const m = levelId.match(/-level-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function shortLabel(levelId: string): string {
  const n = parseLevelIndex(levelId);
  return n != null ? `L${n}` : levelId;
}

function biomeLabel(levelId: string): string | null {
  const n = parseLevelIndex(levelId);
  if (n == null) return null;
  const act = WORLD_1_ACTS.find((a) => n >= a.fromLevel && n <= a.toLevel);
  return act?.title ?? null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function StarRow({ count }: { count: number }) {
  // Render exactly 3 slots so layout doesn't shift between rows.
  return (
    <View style={styles.stars}>
      {[1, 2, 3].map((i) => (
        <Text
          key={i}
          style={[styles.star, i <= count ? styles.starOn : styles.starOff]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

export function ProfileRecentSolvesList({ solves }: ProfileRecentSolvesListProps) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.eyebrow}>RECENT SOLVES</Text>
      {solves.length === 0 ? (
        <Text style={styles.empty}>No recent solves yet.</Text>
      ) : (
        <View style={styles.list}>
          {solves.map((s, i) => {
            const biome = biomeLabel(s.level_id);
            return (
              <View
                key={`${s.level_id}-${s.completed_at}`}
                style={[styles.row, i < solves.length - 1 && styles.rowDivider]}
              >
                <View style={styles.left}>
                  <Text style={styles.levelLabel}>{shortLabel(s.level_id)}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {[biome, fmtDate(s.completed_at), fmtTime(s.time_ms)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <View style={styles.right}>
                  <StarRow count={Math.max(0, Math.min(3, s.stars))} />
                  {s.crown ? <Text style={styles.crown}>♛</Text> : null}
                  <Text style={styles.score} numberOfLines={1}>
                    {s.score.toLocaleString('en-US')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

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
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  left: {
    flexShrink: 1,
    minWidth: 0,
  },
  levelLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: letterSpacing.wider,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  star: {
    fontSize: fontSize.sm,
  },
  starOn: {
    color: colors.accentGold,
  },
  starOff: {
    color: colors.divider,
  },
  crown: {
    color: colors.accentGold,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginLeft: 2,
  },
  score: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    minWidth: 56,
    textAlign: 'right',
  },
});
