/**
 * InviteAcceptedBanner
 *
 * Global gold banner that appears when a duel invite the local
 * player generated has been accepted by their friend. Mounted at
 * the root of `RootNavigator` so it overlays every screen — the
 * inviter sees it regardless of which screen they're on when the
 * acceptance arrives.
 *
 * Data flow:
 *   useDuelInviteStore.acceptance    ← realtime callback in App.tsx
 *                                       writes here when a duel_invites
 *                                       row flips status to 'accepted'.
 *   tap → navigation.navigate('DuelLobby', { ... }) + dismiss
 *   auto-dismiss after 10 seconds if untapped.
 *
 * Visual treatment mirrors the rest of the app's premium gold-accent
 * language: navy glass background, gold accent ring, soft glow.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/profile/Avatar';
import { useDuelInviteStore } from '@/game/state/useDuelInviteStore';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';
import type { RootStackNavigation } from '@/app/navigation/routes';

const AUTO_DISMISS_MS = 10_000;

export function InviteAcceptedBanner() {
  const acceptance = useDuelInviteStore((s) => s.acceptance);
  const dismiss = useDuelInviteStore((s) => s.dismiss);
  const navigation = useNavigation<RootStackNavigation>();
  const insets = useSafeAreaInsets();

  // Auto-dismiss after 10 s of inactivity. Reset whenever the
  // acceptance record changes (a new acceptance restarts the timer).
  useEffect(() => {
    if (!acceptance) return;
    const t = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [acceptance, dismiss]);

  if (!acceptance) return null;

  const handleTap = () => {
    navigation.navigate('DuelLobby', {
      roomId: acceptance.roomId,
      puzzleSeed: acceptance.puzzleSeed,
      mode: acceptance.mode,
      startAt: acceptance.startAt,
    });
    dismiss();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
    >
      <Pressable
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel={`${acceptance.friendName} accepted your duel — tap to play`}
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      >
        <Avatar
          size="sm"
          url={acceptance.friendAvatarUrl}
          fallbackName={acceptance.friendName}
        />
        <View style={styles.text}>
          <Text style={styles.eyebrow}>DUEL ACCEPTED</Text>
          <Text style={styles.body} numberOfLines={1}>
            {`${acceptance.friendName} is ready — tap to play`}
          </Text>
        </View>
        <Text style={styles.cta}>{'Play →'}</Text>
      </Pressable>
    </View>
  );
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
