/**
 * Pending challenge-received notifications, surfaced via the global
 * `<ChallengeReceivedBanner />` mounted at the root of `App.tsx`.
 *
 * Lifecycle:
 *   1. Friend A sends Friend B a challenge → INSERT into `challenges`
 *      with `opponent_id = B`.
 *   2. The realtime subscription in App.tsx watches `challenges`
 *      filtered by `opponent_id = currentUser` for INSERT events.
 *   3. On INSERT, the subscription hydrates the challenger's profile
 *      and writes a `ChallengeReceived` record into this store.
 *   4. The banner subscribes, renders, auto-dismisses after 15s OR
 *      routes to Friends → Challenges on tap.
 *
 * Intentionally NOT persisted — if the app is killed before the
 * recipient sees the banner, the challenge is still in the cloud and
 * they can find it via Friends → Challenges on next launch.
 */

import { create } from 'zustand';

export interface ChallengeReceived {
  challengeId: string;
  /** 'campaign' | 'sprint' — controls which screen the tap routes to. */
  mode: string;
  /** Campaign level id when mode === 'campaign'. */
  levelId: string | null;
  /** Sprint mode id when mode === 'sprint'. */
  sprintModeId: string | null;
  /** The friend who sent it — used for the banner copy. */
  fromName: string;
  fromAvatarUrl: string | null;
  /** Epoch ms when this record was created. Used by the auto-dismiss
   *  timer + de-duplication. */
  receivedAt: number;
}

interface ChallengeReceivedStore {
  notification: ChallengeReceived | null;
  setNotification: (n: ChallengeReceived) => void;
  dismiss: () => void;
}

export const useChallengeReceivedStore = create<ChallengeReceivedStore>(
  (set) => ({
    notification: null,
    setNotification: (n) => set({ notification: n }),
    dismiss: () => set({ notification: null }),
  }),
);
