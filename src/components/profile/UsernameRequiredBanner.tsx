/**
 * UsernameRequiredBanner
 *
 * Persistent gold banner that appears for authenticated users who haven't
 * picked a `@handle` yet. The handle is required for leaderboard postings
 * and duel attribution — without one, the player shows up as their
 * display name only (or a generic fallback) which means their friends
 * can't search for them, friend requests don't resolve cleanly, and
 * duel results display less nicely.
 *
 * Behaviour:
 *   - Shown whenever `status === 'authenticated'` AND
 *     `profile.username` is missing/empty.
 *   - Hidden on the EditProfile and Auth screens themselves (the user
 *     is clearly mid-setup — no need to nag).
 *   - Does NOT auto-dismiss. Persistent prompt until the user sets a
 *     handle (at which point the banner disappears on its own once
 *     `profile.username` is non-empty).
 *   - Tapping navigates to `EditProfile`.
 *
 * Mounted globally at the root of `RootNavigator` inside `App.tsx`,
 * alongside `<InviteAcceptedBanner />` — when both are active the
 * username banner sits below the invite banner (invite banner is
 * transient, this one is persistent).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/game/state/useAuthStore';
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

// Screens where the banner is intentionally suppressed. The user is
// already setting up their profile, or in the middle of signing in.
const SUPPRESS_ON_ROUTES = new Set(['EditProfile', 'Auth', 'AvatarCrop']);

export function UsernameRequiredBanner() {
  const navigation = useNavigation<RootStackNavigation>();
  const insets = useSafeAreaInsets();

  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const inviteAcceptance = useDuelInviteStore((s) => s.acceptance);

  // Read the currently focused route name. `useNavigationState` re-renders
  // this banner when navigation moves between screens, so the hide-on-
  // EditProfile rule stays in sync.
  const activeRouteName = useNavigationState((state) => {
    if (!state) return null;
    const route = state.routes[state.index];
    return route?.name ?? null;
  });

  const hasUsername =
    typeof profile?.username === 'string' && profile.username.length > 0;
  const shouldShow =
    status === 'authenticated' &&
    !hasUsername &&
    (activeRouteName == null || !SUPPRESS_ON_ROUTES.has(activeRouteName));

  if (!shouldShow) return null;

  // If the invite-acceptance banner is currently visible, drop this one
  // below it so they don't overlap. Invite banner is ~64–72px tall
  // including its safe-area padding.
  const verticalOffset = inviteAcceptance ? insets.top + spacing.sm + 72 : insets.top + spacing.sm;

  const handleTap = () => {
    navigation.navigate('EditProfile');
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: verticalOffset }]}
    >
      <Pressable
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel="Pick your @handle for leaderboards and duels"
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      >
        <View style={styles.iconBadge}>
          <Text style={styles.iconGlyph}>{'@'}</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.eyebrow}>PICK YOUR HANDLE</Text>
          <Text style={styles.body} numberOfLines={1}>
            {'Required for leaderboards & duels'}
          </Text>
        </View>
        <Text style={styles.cta}>{'Set up →'}</Text>
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
    zIndex: 999,
    elevation: 999,
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
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 213, 138, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
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
