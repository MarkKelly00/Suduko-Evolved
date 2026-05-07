import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setStorage } from '@/services/persistence/storage';
import { MMKVStorage } from '@/services/persistence/mmkvStorage';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { useGameStore } from '@/game/state/useGameStore';
import { useAuthStore } from '@/game/state/useAuthStore';
import { audioService } from '@/services/audio/audioService';
import { authService, isSupabaseConfigured } from '@/services/supabase';
import { drainPendingSubmissions } from '@/game/sync/pendingSubmissionsQueue';
import { runLocalToCloudSync } from '@/game/sync/localToCloudSync';
import { RootNavigator } from '@/app/navigation/RootNavigator';
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
          // Run local→cloud sync + drain queue once we're signed in.
          void runLocalToCloudSync(session.user.id);
        } else {
          auth.setStatus('guest');
        }
      } catch (err) {
        if (__DEV__) console.warn('[App] auth bootstrap failed', err);
        clearTimeout(fallbackTimer);
        auth.setStatus('guest');
      }
    })();

    unsubscribe = authService.onAuthStateChange(async (event, session) => {
      const current = useAuthStore.getState();
      if (event === 'SIGNED_OUT') {
        current.resetToGuest();
        return;
      }
      if (session?.user) {
        const wasAuthenticated = current.status === 'authenticated';
        current.setSession(session);
        current.setUser(session.user);
        try {
          const { profile, isOnboarding } = await authService.ensureProfile(session.user);
          current.setProfile(profile);
          current.setIsOnboarding(isOnboarding);
        } catch (err) {
          if (__DEV__) console.warn('[App] ensureProfile (state change) failed', err);
        }
        current.setStatus('authenticated');
        if (!wasAuthenticated) {
          void runLocalToCloudSync(session.user.id);
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
