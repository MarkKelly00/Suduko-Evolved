/**
 * ActProgressHeader
 *
 * Slim sticky-ish band at the top of the map that announces which act
 * the player has scrolled into. Updates as the visible viewport center
 * passes the y-midpoint of each act's level cluster.
 *
 * Visuals:
 *   • ACT I / II / III eyebrow with the act's accent
 *   • Act title (e.g. "Seed Grove")
 *   • Tagline + "X of Y cleared" stats (cleared count + stars + crowns)
 *
 * Designed to fit alongside the existing back button; positions itself
 * with absolute placement at the viewport top. Does not interrupt scroll
 * (`pointerEvents="none"`). Only re-renders when the active act changes
 * (driven by a Reanimated derived JS hand-off — small).
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useAnimatedReaction,
  type SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import {
  WORLD_1_ACTS,
  WORLD_1_NODE_LAYOUT,
  type WorldAct,
} from './mapLayout';
import { useProgressStore } from '@/game/state/useProgressStore';
import { levelId as makeLevelId } from '@/game/content/levels';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

interface Props {
  scrollY: SharedValue<number>;
  /** Pixel offset for the band from the screen bottom — usually
   *  `insets.bottom + spacing.sm` so the pill sits just above the home
   *  indicator. (The pill was originally top-anchored but covered the
   *  world-header copy at the top of the map; bottom-anchored reads
   *  cleaner and never collides with the existing back button.) */
  bottom: number;
}

interface ActBucket {
  act: WorldAct;
  index: number; // 0..2
  yMidpoint: number;
}

export function ActProgressHeader({ scrollY, bottom }: Props) {
  // Compute each act's vertical midpoint once. Used by the scroll
  // reaction to decide which act the viewport is currently inside.
  const buckets = useMemo<ActBucket[]>(() => {
    return WORLD_1_ACTS.map((act, i) => {
      const fromY =
        WORLD_1_NODE_LAYOUT.find((n) => n.level === act.fromLevel)?.y ?? 0;
      const toY =
        WORLD_1_NODE_LAYOUT.find((n) => n.level === act.toLevel)?.y ?? fromY;
      return { act, index: i, yMidpoint: (fromY + toY) / 2 };
    });
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);

  // Decide active act from the scroll position. The "viewport center" is
  // approximated as scrollY + 280 (a fixed lead so the header flips a
  // touch ahead of the actual midpoint, which feels more responsive).
  useAnimatedReaction(
    () => scrollY.value,
    (current) => {
      'worklet';
      const lead = current + 280;
      let idx = 0;
      for (let i = 0; i < buckets.length; i++) {
        if (lead >= buckets[i]!.yMidpoint) idx = i;
      }
      runOnJS(setActiveIndex)(idx);
    },
    [buckets],
  );

  const active = buckets[activeIndex] ?? buckets[0];
  if (!active) return null;
  const { act } = active;

  // Lightweight per-act stats from the local progress store. Reads on
  // every render of the header — cheap (range of 10 levels per act).
  const levelEntries = useProgressStore((s) => s.levels);
  const stats = useMemo(() => {
    let cleared = 0;
    let stars = 0;
    let crowns = 0;
    for (let lvl = act.fromLevel; lvl <= act.toLevel; lvl++) {
      const entry = levelEntries[makeLevelId(lvl)];
      if (entry) {
        cleared += 1;
        stars += entry.stars;
        if (entry.crown) crowns += 1;
      }
    }
    const total = act.toLevel - act.fromLevel + 1;
    return { cleared, total, stars, crowns };
  }, [levelEntries, act.fromLevel, act.toLevel]);

  return (
    <View
      style={[styles.band, { bottom }]}
      pointerEvents="none"
      accessibilityRole="header"
      accessibilityLabel={`Act ${ROMAN[active.index + 1]}, ${act.title}, ${stats.cleared} of ${stats.total} cleared`}
    >
      <View
        style={[
          styles.pill,
          {
            borderColor: act.primary,
            shadowColor: act.primary,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: act.primary }]}>
          ACT {ROMAN[active.index + 1]}
        </Text>
        <Text
          style={[styles.title, { color: act.primary }]}
          numberOfLines={1}
        >
          {act.title}
        </Text>
        <Text style={styles.stats} numberOfLines={1}>
          {stats.cleared}/{stats.total} cleared · ★{stats.stars} · ♛{stats.crowns}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: 'rgba(11,18,32,0.78)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrow: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  stats: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wide,
    fontWeight: fontWeight.medium,
  },
});
