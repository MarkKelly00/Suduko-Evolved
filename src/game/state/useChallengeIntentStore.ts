/**
 * Outbound challenge intent. When a user taps "Challenge" on a friend's
 * profile (or a leaderboard row), we stash the target friend's id here,
 * navigate them to a playable level/sprint, and the Results screen reads
 * this back to surface a single-tap "Send challenge" CTA pre-filled with
 * the target friend.
 *
 * Lives entirely in memory (no persistence): if the user backgrounds the
 * app or restarts, the intent is dropped. That's intentional — outbound
 * challenge flows have a hot, short window of intent and shouldn't leak
 * across sessions.
 */
import { create } from 'zustand';

import type { Profile } from '@/services/supabase/supabaseTypes';

interface ChallengeIntentState {
  target: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'> | null;
  setTarget: (
    target: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>,
  ) => void;
  clear: () => void;
}

export const useChallengeIntentStore = create<ChallengeIntentState>()((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  clear: () => set({ target: null }),
}));
