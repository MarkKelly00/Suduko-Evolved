/**
 * Pending invite-acceptance notifications, surfaced via the global
 * `<InviteAcceptedBanner />` mounted at the root of `RootNavigator`.
 *
 * Lifecycle:
 *   1. The inviter generates a duel invite link (createDuelLink RPC).
 *   2. The realtime subscription in App.tsx watches duel_invites
 *      filtered by challenger_id = current user.
 *   3. When the friend taps the link and redeems it server-side,
 *      duel_invites.status flips 'pending' → 'accepted' and the room
 *      is created — that fires the realtime callback, which writes
 *      an `InviteAcceptance` record into this store.
 *   4. The banner component subscribes, renders, auto-dismisses
 *      after 10s OR navigates to DuelLobby on tap.
 *
 * Intentionally not persisted — if the app is killed before the
 * inviter sees the banner, the invite is still in the cloud and
 * they can find it via Friends → Challenges (or the lobby flow on
 * next launch). Persistence here would just complicate cleanup.
 */

import { create } from 'zustand';

export interface InviteAcceptance {
  inviteId: string;
  challengerId: string;
  /** The friend who just accepted — used for the banner copy. */
  friendName: string;
  friendAvatarUrl: string | null;
  /** The duel_rooms.id the redeem RPC just created — both players
   *  should navigate to DuelLobby with this id to enter together. */
  roomId: string;
  puzzleSeed: string;
  mode: string;
  /** Server-set ISO timestamp the duel countdown synchronizes to. */
  startAt: string;
  /** Epoch ms when this record was created. Used by the banner's
   *  auto-dismiss timer + de-duplication. */
  receivedAt: number;
}

interface DuelInviteStore {
  acceptance: InviteAcceptance | null;
  setAcceptance: (a: InviteAcceptance) => void;
  dismiss: () => void;
}

export const useDuelInviteStore = create<DuelInviteStore>((set) => ({
  acceptance: null,
  setAcceptance: (a) => set({ acceptance: a }),
  dismiss: () => set({ acceptance: null }),
}));
