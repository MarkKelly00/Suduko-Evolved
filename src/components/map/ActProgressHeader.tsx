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
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  useAnimatedReaction,
  type SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { getActBuckets, type ActBucket } from './worldRegistry';
import { useProgressStore } from '@/game/state/useProgressStore';
import { levelIdForGlobal } from '@/game/content/levels';
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

export function ActProgressHeader({ scrollY, bottom }: Props) {
  const { width } = useWindowDimensions();
  // Act buckets across every enabled world (3 for World 1; 6 once Astral
  // Nexus is on). Midpoints are in GLOBAL scroll coords so the band flips as
  // the player scrolls down through both worlds.
  const buckets = useMemo<ActBucket[]>(() => getActBuckets(), []);

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

  const active = buckets[activeIndex] ?? buckets[0]!;

  // Lightweight per-act stats from the local progress store. Reads on
  // every render of the header — cheap (range of 10 levels per act). Hooks
  // run unconditionally (buckets always has ≥1 entry, so `active` is defined).
  const levelEntries = useProgressStore((s) => s.levels);
  const fromGlobal = active.fromGlobal;
  const toGlobal = active.toGlobal;
  const stats = useMemo(() => {
    let cleared = 0;
    let stars = 0;
    let crowns = 0;
    for (let lvl = fromGlobal; lvl <= toGlobal; lvl++) {
      const entry = levelEntries[levelIdForGlobal(lvl)];
      if (entry) {
        cleared += 1;
        stars += entry.stars;
        if (entry.crown) crowns += 1;
      }
    }
    const total = toGlobal - fromGlobal + 1;
    return { cleared, total, stars, crowns };
  }, [levelEntries, fromGlobal, toGlobal]);

  const { act } = active;
  const roman = ROMAN[active.actIndexInWorld + 1] ?? `${active.actIndexInWorld + 1}`;

  return (
    <View
      style={[styles.band, { bottom }]}
      pointerEvents="none"
      accessibilityRole="header"
      accessibilityLabel={`${active.worldName}, Act ${roman}, ${act.title}, ${stats.cleared} of ${stats.total} cleared`}
    >
      <View
        style={[
          styles.pill,
          {
            borderColor: act.primary,
            shadowColor: act.primary,
            maxWidth: width - spacing.lg * 2,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: act.primary }]} numberOfLines={1}>
          {active.worldName.toUpperCase()} · ACT {roman}
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
    backgroundColor: 'rgba(11,18,32,0.82)',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    // Centered vertical stack: eyebrow / act title / stats. Stacking (rather
    // than a single row) keeps long act names like "Oracle Bloom Temple" and
    // "Celestial Engine" from overflowing the screen edges.
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrow: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
    textAlign: 'center',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
  },
  stats: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wide,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
