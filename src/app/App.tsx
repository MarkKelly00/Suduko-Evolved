import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { linkingConfig } from '@/app/navigation/deepLinks';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setStorage } from '@/services/persistence/storage';
import { MMKVStorage } from '@/services/persistence/mmkvStorage';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { useGameStore } from '@/game/state/useGameStore';
import { useAuthStore } from '@/game/state/useAuthStore';
import { audioService } from '@/services/audio/audioService';
import { gameCenterService } from '@/services/gameCenter';
import { duelRealtimeService } from '@/services/duel';
import { InviteAcceptedBanner } from '@/components/duel/InviteAcceptedBanner';
import { UsernameRequiredBanner } from '@/components/profile/UsernameRequiredBanner';
import { ChallengeReceivedBanner } from '@/components/friends/ChallengeReceivedBanner';
import { useDuelInviteStore } from '@/game/state/useDuelInviteStore';
import { useChallengeReceivedStore } from '@/game/state/useChallengeReceivedStore';
import {
  authService,
  isSupabaseConfigured,
  profileService,
} from '@/services/supabase';
import { drainPendingSubmissions } from '@/game/sync/pendingSubmissionsQueue';
import { runLocalToCloudSync } from '@/game/sync/localToCloudSync';
import { runCloudToLocalSync } from '@/game/sync/cloudToLocalSync';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { navigationRef } from '@/app/navigation/navigationRef';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { colors } from '@/theme';

export default function App() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wire up MMKV-backed storage and hydrate persistent stores. We do this
    // synchronously before painting the navigator so screens can read from
    // the stores without a flash of empty state.
    setStorage(new MMKVStorage());
    useSettingsStore.getState().hydrate();
    useProgressStore.getState().hydrate();
    void audioService.preloadSfx();
    // Initialize the iOS Game Center service. Always safe to call —
    // it's a typed no-op on Android, on iOS builds without the native
    // module compiled in, and on opt-out users (it never presents the
    // sign-in sheet from here; only Settings opt-in does that).
    void gameCenterService.initialize();
    setHydrated(true);
  }, []);

  // Bootstrap auth. Runs once after stores hydrate.
  useEffect(() => {
    if (!hydrated) return;
    let unsubscribe: (() => void) | null = null;
    let timedOut = false;

    const auth = useAuthStore.getState();

    if (!isSupabaseConfigured()) {
      // No env wired up — guests still play normally.
      auth.setStatus('guest');
      return;
    }

    auth.setStatus('loading');

    // Safety net: never block the app shell on the network.
    const fallbackTimer = setTimeout(() => {
      timedOut = true;
      const current = useAuthStore.getState();
      if (current.status === 'loading') {
        current.setStatus('guest');
      }
    }, 1500);

    void (async () => {
      try {
        const session = await authService.initialize();
        if (timedOut) return;
        clearTimeout(fallbackTimer);
        if (session?.user) {
          auth.setSession(session);
          auth.setUser(session.user);
          try {
            const { profile, isOnboarding } = await authService.ensureProfile(session.user);
            auth.setProfile(profile);
            auth.setIsOnboarding(isOnboarding);
          } catch (err) {
            if (__DEV__) console.warn('[App] ensureProfile failed', err);
          }
          auth.setStatus('authenticated');
          // Sync. Order matters: localToCloud first (uploads any local
          // bests that beat cloud — handles the guest-migration path
          // for first-time sign-ins), then cloudToLocal (downloads
          // every other user's data and merges, ensuring we never
          // miss cross-device wins).
          void (async () => {
            await runLocalToCloudSync(session.user.id);
            await runCloudToLocalSync(session.user.id);
          })();
        } else {
          auth.setStatus('guest');
        }
      } catch (err) {
        if (__DEV__) console.warn('[App] auth bootstrap failed', err);
        clearTimeout(fallbackTimer);
        auth.setStatus('guest');
      }
    })();

    // IMPORTANT: keep this callback synchronous and fire heavy work via
    // setTimeout(0). supabase-js awaits each listener inside its own
    // setSession() / token-refresh path; if we await Supabase calls in
    // here we deadlock the auth client (documented gotcha — see
    // https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    // "Callbacks can be awaited so an asynchronous request will block all
    // subsequent client requests until it completes.").
    unsubscribe = authService.onAuthStateChange((event, session) => {
      const current = useAuthStore.getState();
      if (event === 'SIGNED_OUT') {
        // Wipe both auth state AND local progress on sign-out so the
        // next user (whether the same account on a different session
        // or a different account entirely) starts with a clean local
        // store and gets their own data restored from cloud on the
        // next sign-in. Without this wipe, user A's level scores leak
        // into user B's account when B signs in on the same device.
        current.resetToGuest();
        useProgressStore.getState().reset();
        return;
      }
      if (session?.user) {
        const wasAuthenticated = current.status === 'authenticated';
        current.setSession(session);
        current.setUser(session.user);
        // Defer ensureProfile out of the auth listener so supabase-js can
        // finish its setSession bookkeeping before we hit it again.
        setTimeout(() => {
          void (async () => {
            try {
              const { profile, isOnboarding } = await authService.ensureProfile(
                session.user,
              );
              const after = useAuthStore.getState();
              after.setProfile(profile);
              after.setIsOnboarding(isOnboarding);
              after.setStatus('authenticated');
            } catch (err) {
              if (__DEV__) console.warn('[App] ensureProfile (state change) failed', err);
              useAuthStore.getState().setStatus('authenticated');
            }
          })();
        }, 0);
        if (!wasAuthenticated) {
          // Sync. Same ordering rule as the bootstrap path:
          // localToCloud first (guest migration on first sign-in),
          // then cloudToLocal (download user's bests). Deferred via
          // setTimeout so supabase-js can finish its setSession
          // bookkeeping before we issue the queries.
          setTimeout(() => {
            void (async () => {
              await runLocalToCloudSync(session.user.id);
              await runCloudToLocalSync(session.user.id);
            })();
          }, 0);
        }
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe?.();
    };
  }, [hydrated]);

  // Pause the active session when the OS suspends the app (Home button,
  // multitasking switch, incoming call). The player has to explicitly tap
  // "Resume" when they come back, so the timer doesn't quietly accumulate
  // background time and crowns stay fairly earned.
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      const game = useGameStore.getState();
      if (game.active && game.active.status === 'playing') {
        if (next === 'background' || next === 'inactive') {
          game.pauseSession();
        }
      }
      // On foreground, attempt to drain the pending-submissions queue.
      // Best-effort; ignores network errors.
      if (next === 'active') {
        void drainPendingSubmissions();
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);

  // Listen for invite-acceptance events for the local player. When a
  // friend taps the inviter's link and the redeem RPC flips
  // duel_invites.status to 'accepted', this realtime subscription
  // fires, hydrates the friend's profile for the banner copy, and
  // pushes an InviteAcceptance into useDuelInviteStore — which is
  // rendered globally by <InviteAcceptedBanner /> in RootNavigator.
  //
  // Re-subscribes when the active profile changes (sign-out → sign-in
  // as a different user). Unsubscribes on cleanup so we don't leak
  // channels across sessions.
  const myProfileId = useAuthStore((s) => s.profile?.id ?? null);
  useEffect(() => {
    if (!myProfileId) return;
    const unsub = duelRealtimeService.subscribeInviteAcceptance(
      myProfileId,
      async (invite) => {
        if (!invite.room_id || !invite.puzzle_seed || !invite.opponent_id) {
          // Server should never flip status to 'accepted' without
          // populating these — but guard against a partial UPDATE.
          if (__DEV__) {
            console.warn(
              '[App] invite acceptance missing room_id/seed/opponent_id',
              invite,
            );
          }
          return;
        }
        // Pull the friend's profile so the banner has a name + avatar.
        // Best-effort — if it fails, fall back to a generic label.
        const friend = await profileService.getProfile(invite.opponent_id);
        useDuelInviteStore.getState().setAcceptance({
          inviteId: invite.id,
          challengerId: invite.challenger_id,
          friendName:
            friend?.display_name ?? friend?.username ?? 'A friend',
          friendAvatarUrl: friend?.avatar_url ?? null,
          roomId: invite.room_id,
          puzzleSeed: invite.puzzle_seed,
          mode: invite.mode,
          // The redeem RPC sets duel_rooms.start_at to now + 5s,
          // but we don't have that on the invite row. The DuelLobby
          // re-reads start_at from the room when it mounts, so we
          // can pass `updated_at` (a close-enough timestamp) or an
          // empty string here — DuelLobby's effect re-fetches the
          // canonical value either way.
          startAt: invite.updated_at ?? new Date().toISOString(),
          receivedAt: Date.now(),
        });
      },
    );
    return () => {
      unsub();
      // Clear any pending banner when the user signs out / switches.
      useDuelInviteStore.getState().dismiss();
    };
  }, [myProfileId]);

  // Listen for incoming challenges aimed at the local player. INSERTs
  // into `challenges` with `opponent_id = me` fire this callback; we
  // hydrate the challenger's profile (best-effort) and push a record
  // into useChallengeReceivedStore — rendered globally by
  // <ChallengeReceivedBanner /> as a 15s auto-dismissing gold pill.
  useEffect(() => {
    if (!myProfileId) return;
    const unsub = duelRealtimeService.subscribeIncomingChallenges(
      myProfileId,
      async (challenge) => {
        // Best-effort profile lookup. If it fails the banner shows
        // a generic "A friend" label rather than failing silently.
        const friend = await profileService.getProfile(challenge.challenger_id);
        useChallengeReceivedStore.getState().setNotification({
          challengeId: challenge.id,
          mode: challenge.mode,
          levelId: challenge.level_id,
          sprintModeId: challenge.sprint_mode_id,
          fromName:
            friend?.display_name ?? friend?.username ?? 'A friend',
          fromAvatarUrl: friend?.avatar_url ?? null,
          receivedAt: Date.now(),
        });
      },
    );
    return () => {
      unsub();
      useChallengeReceivedStore.getState().dismiss();
    };
  }, [myProfileId]);

  if (!hydrated) return null;

  const navTheme = {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.divider,
      primary: colors.accentGold,
      notification: colors.accentGold,
    },
  };

  return (
    // Root error boundary — catches any unhandled JS render error so
    // it can't propagate to the native bridge and become a fatal
    // crash on launch (build 16 regression: a banner component
    // mounted at the NavigationContainer root used `useNavigation`,
    // which threw on initial mount in production and brought down
    // the whole app shell via RCTExceptionsManager).
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaProvider>
          <NavigationContainer
            ref={navigationRef}
            theme={navTheme}
            linking={linkingConfig}
          >
            <StatusBar style="light" />
            <RootNavigator />
            {/* Global overlay: appears whenever the invite-acceptance
                realtime subscription writes a record into useDuelInviteStore.
                Lives outside RootNavigator's stack so it persists across
                every navigation transition. Uses the imperative
                `navigationRef` for taps — NOT `useNavigation`. */}
            <InviteAcceptedBanner />
            {/* Persistent prompt for authenticated users who haven't yet
                picked a `@handle`. Auto-hides when profile.username is
                set, and is suppressed on EditProfile / Auth screens so we
                don't nag users while they're already setting one up. */}
            <UsernameRequiredBanner />
            {/* In-app notification when a friend sends the local player
                a challenge (campaign level or time-trial sprint).
                Auto-dismisses after 15s; tap → Friends → Challenges. */}
            <ChallengeReceivedBanner />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
