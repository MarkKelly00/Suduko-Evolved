import { create } from 'zustand';

import type { AuthSession, AuthUser } from '@/services/supabase/authService';
import type { Profile } from '@/services/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unauthenticated';
export type SyncStatus = 'idle' | 'running' | 'done' | 'error';

interface AuthStateData {
  status: AuthStatus;
  session: AuthSession | null;
  user: AuthUser | null;
  profile: Profile | null;
  /** True on the very first auth — before username + display_name are set. */
  isOnboarding: boolean;
  /** Action queued by AuthGate; AuthScreen runs it after a successful sign-in. */
  pendingAction: (() => void) | null;
  syncStatus: SyncStatus;
}

interface AuthActions {
  setStatus: (status: AuthStatus) => void;
  setSession: (session: AuthSession | null) => void;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsOnboarding: (isOnboarding: boolean) => void;
  setPendingAction: (action: (() => void) | null) => void;
  setSyncStatus: (s: SyncStatus) => void;
  /** Clear everything to guest state. */
  resetToGuest: () => void;
}

export type AuthState = AuthStateData & AuthActions;

const initial: AuthStateData = {
  status: 'loading',
  session: null,
  user: null,
  profile: null,
  isOnboarding: false,
  pendingAction: null,
  syncStatus: 'idle',
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,
  setStatus: (status) => set({ status }),
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsOnboarding: (isOnboarding) => set({ isOnboarding }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  resetToGuest: () =>
    set({
      status: 'guest',
      session: null,
      user: null,
      profile: null,
      isOnboarding: false,
      pendingAction: null,
      syncStatus: 'idle',
    }),
}));

/** Convenience selector. */
export function useAuth() {
  return useAuthStore((s) => ({
    status: s.status,
    user: s.user,
    profile: s.profile,
    isOnboarding: s.isOnboarding,
    syncStatus: s.syncStatus,
  }));
}

/** True iff a real user is signed in (not guest, not loading). */
export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.status === 'authenticated');
}
