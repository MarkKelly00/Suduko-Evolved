/**
 * ChallengeReceivedBanner
 *
 * Global gold banner that appears when a friend sends the local player
 * a challenge (campaign level OR time-trial sprint). Mounted at the
 * root of `App.tsx` so it overlays every screen.
 *
 * Important: this component lives OUTSIDE any Navigator's Screen
 * tree, so it MUST NOT call `useNavigation()` directly. We use the
 * imperative `navigationRef` instead (same pattern as the other two
 * global banners).
 *
 * Data flow:
 *   useChallengeReceivedStore.notification    ← realtime callback in App.tsx
 *                                                writes here on INSERT into
 *                                                `challenges` with
 *                                                opponent_id = me.
 *   tap → navigationRef.navigate('Friends', { initialTab: 'challenges' })
 *         + dismiss
 *   auto-dismiss after 15 seconds if untapped.
 *
 * Visual treatment mirrors `InviteAcceptedBanner` — navy glass
 * background, gold accent ring, soft glow.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/profile/Avatar';
import { useChallengeReceivedStore } from '@/game/state/useChallengeReceivedStore';
import { navigateSafe } from '@/app/navigation/navigationRef';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

const AUTO_DISMISS_MS = 15_000;

export function ChallengeReceivedBanner() {
  const notification = useChallengeReceivedStore((s) => s.notification);
  const dismiss = useChallengeReceivedStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [notification, dismiss]);

  if (!notification) return null;

  const handleTap = () => {
    navigateSafe('Friends', { initialTab: 'challenges' });
    dismiss();
  };

  const targetCopy = describeTarget(notification);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
    >
      <Pressable
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel={`${notification.fromName} challenged you on ${targetCopy} — tap to play`}
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      >
        <Avatar
          size="sm"
          url={notification.fromAvatarUrl}
          fallbackName={notification.fromName}
        />
        <View style={styles.text}>
          <Text style={styles.eyebrow}>NEW CHALLENGE</Text>
          <Text style={styles.body} numberOfLines={1}>
            {`${notification.fromName} → ${targetCopy}`}
          </Text>
        </View>
        <Text style={styles.cta}>{'Play →'}</Text>
      </Pressable>
    </View>
  );
}

function describeTarget(n: {
  mode: string;
  levelId: string | null;
  sprintModeId: string | null;
}): string {
  if (n.mode === 'campaign' && n.levelId) {
    // 'world1-level-12' → 'L12'
    const m = n.levelId.match(/level-(\d+)/);
    return m ? `L${m[1]}` : 'campaign';
  }
  if (n.mode === 'sprint' && n.sprintModeId) {
    if (n.sprintModeId === 'sprint-3min') return '3-Min Sprint';
    return n.sprintModeId;
  }
  return 'a duel';
}

const styles = StyleSheet.create({
  // Container is a pass-through so taps outside the banner fall
  // through to the screen underneath.
  container: {
    position: 'absolute',
    top: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
    elevation: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentGold,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  bannerPressed: { opacity: 0.85 },
  text: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.accentGoldDim,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
  },
  body: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  cta: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
});
