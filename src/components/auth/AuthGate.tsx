import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '@/game/state/useAuthStore';
import type { RootStackNavigation } from '@/app/navigation/routes';

export interface RequireAuthOptions {
  /** Subtitle shown on the AuthScreen modal — e.g. "Sign in to challenge friends". */
  contextSubtitle?: string;
}

/**
 * Hook that guards an action behind authentication. If already signed in,
 * runs `action()` synchronously. Otherwise stores the action in
 * `useAuthStore.pendingAction` and opens the Auth modal; AuthScreen runs
 * the action after a successful sign-in.
 *
 * Usage:
 *   const requireAuth = useAuthGate();
 *   requireAuth(() => navigation.navigate('Friends'), {
 *     contextSubtitle: 'Sign in to find your friends.',
 *   });
 */
export function useAuthGate() {
  const navigation = useNavigation<RootStackNavigation>();

  return useCallback(
    (action: () => void, opts: RequireAuthOptions = {}) => {
      const { status, setPendingAction } = useAuthStore.getState();
      if (status === 'authenticated') {
        action();
        return;
      }
      setPendingAction(action);
      navigation.navigate('Auth', { contextSubtitle: opts.contextSubtitle });
    },
    [navigation],
  );
}
