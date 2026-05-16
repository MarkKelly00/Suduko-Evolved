/**
 * AchievementUnlockToast
 *
 * Global top-of-screen banner that surfaces newly-unlocked achievements.
 * Mounted once at the NavigationContainer root (alongside the other
 * global banners), so it overlays every screen — including gameplay —
 * without being a Stack.Screen itself.
 *
 * Data flow:
 *   reportAchievementsWithProgress() in achievementProgress.ts pushes
 *   the achievement ID into useAchievementToastStore when a submission
 *   first transitions to 100 %. The toast component reads `queue[0]`,
 *   animates the banner in, holds for AUTO_DISMISS_MS, then dismisses —
 *   which pops the head and (if more remain) animates the next one in.
 *
 * The component honours `useSettingsStore.reducedMotion`: when ON, the
 * slide-in animation is replaced with an instant fade.
 *
 * Tapping the banner navigates to the in-app Achievements screen via the
 * imperative `navigationRef` (this component lives OUTSIDE any Screen
 * tree, so `useNavigation()` would crash on initial mount).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AchievementGlyph } from '@/components/achievements/AchievementGlyph';
import { ACHIEVEMENT_METADATA } from '@/game/achievements/metadata';
import {
  getAchievementTier,
  TIER_COLORS,
} from '@/game/achievements/tiers';
import { useAchievementToastStore } from '@/game/state/useAchievementToastStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { navigateSafe } from '@/app/navigation/navigationRef';
import {
  ACHIEVEMENT_POINTS,
  type GameCenterAchievementId,
} from '@/services/gameCenter';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

const SLIDE_IN_MS = 280;
const HOLD_MS = 3500;
const SLIDE_OUT_MS = 220;

export function AchievementUnlockToast() {
  const head = useAchievementToastStore((s) => s.queue[0] ?? null);
  const dismiss = useAchievementToastStore((s) => s.dismiss);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const insets = useSafeAreaInsets();

  // Per-toast keyed animation. The shared value resets to its starting
  // position every time `head` flips, so back-to-back unlocks each
  // get their own clean animation cycle.
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (head == null) return;

    // Reset to starting position before animating in.
    translateY.setValue(reducedMotion ? 0 : -120);
    opacity.setValue(0);

    let cancelled = false;
    const slideIn = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: reducedMotion ? 0 : SLIDE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: reducedMotion ? 120 : SLIDE_IN_MS,
        useNativeDriver: true,
      }),
    ]);
    const slideOut = Animated.parallel([
      Animated.timing(translateY, {
        toValue: reducedMotion ? 0 : -120,
        duration: reducedMotion ? 0 : SLIDE_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: reducedMotion ? 120 : SLIDE_OUT_MS,
        useNativeDriver: true,
      }),
    ]);

    slideIn.start(() => {
      if (cancelled) return;
      const hold = setTimeout(() => {
        if (cancelled) return;
        slideOut.start(() => {
          if (cancelled) return;
          dismiss();
        });
      }, HOLD_MS);
      // Stash the timer on the animation so cleanup can clear it.
      (slideIn as unknown as { _holdTimer?: ReturnType<typeof setTimeout> })._holdTimer = hold;
    });

    return () => {
      cancelled = true;
      const t = (slideIn as unknown as { _holdTimer?: ReturnType<typeof setTimeout> })._holdTimer;
      if (t) clearTimeout(t);
      slideIn.stop();
      slideOut.stop();
    };
  }, [head, dismiss, opacity, translateY, reducedMotion]);

  if (head == null) return null;

  const id: GameCenterAchievementId = head;
  const meta = ACHIEVEMENT_METADATA[id];
  const tier = getAchievementTier(id);
  const tone = TIER_COLORS[tier];
  const points = ACHIEVEMENT_POINTS[id] ?? 0;

  const handleTap = () => {
    navigateSafe('Achievements');
    dismiss();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
    >
      <Animated.View
        style={{
          transform: [{ translateY }],
          opacity,
        }}
      >
        <Pressable
          onPress={handleTap}
          accessibilityRole="button"
          accessibilityLabel={`Achievement unlocked: ${meta?.name ?? id}. Tap to view all.`}
          style={({ pressed }) => [
            styles.banner,
            { borderColor: tone.primary, shadowColor: tone.primary },
            pressed && styles.bannerPressed,
          ]}
        >
          <AchievementGlyph id={id} size={56} />
          <View style={styles.text}>
            <Text style={[styles.eyebrow, { color: tone.primary }]}>
              {`${tone.label.toUpperCase()} UNLOCKED`}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {meta?.name ?? id}
            </Text>
            <Text style={styles.points}>{`+${points} pts`}</Text>
          </View>
          <Text style={[styles.cta, { color: tone.primary }]}>{'View →'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 1100,
    elevation: 1100,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: 'rgba(11, 18, 32, 0.96)',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  bannerPressed: {
    opacity: 0.88,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  points: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  cta: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
});
