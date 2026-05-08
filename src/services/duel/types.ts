/**
 * Cross-cutting duel types. The persistence shapes (DuelRoom etc.) live in
 * supabaseTypes.ts; this module owns the *runtime* shapes the screens and
 * realtime channel pass around.
 */

import type {
  DuelAttempt,
  DuelInvite,
  DuelParticipant,
  DuelRoom,
} from '@/services/supabase/supabaseTypes';

export type { DuelAttempt, DuelInvite, DuelParticipant, DuelRoom };

/** Outcome of `join_matchmaking`. */
export type MatchmakingResult =
  | { status: 'searching' }
  | { status: 'in_active_duel'; roomId: string }
  | {
      status: 'matched';
      roomId: string;
      puzzleSeed: string;
      mode: string;
      startAt: string;
      opponentSlot: 1 | 2;
    };

/** Output of `create_friend_duel`. */
export interface FriendDuelHandle {
  inviteId: string;
  inviteCode: string;
  mode: string;
  opponentId: string;
  expiresAt: string;
}

/** Output of `create_duel_link`. */
export interface DuelLinkHandle {
  inviteId: string;
  inviteCode: string;
  mode: string;
  shareUrl: string;
  expiresAt: string;
}

/** Output of `redeem_duel_invite`. */
export interface RedeemedInvite {
  roomId: string;
  puzzleSeed: string;
  mode: string;
  startAt: string;
  challengerId: string;
  opponentId: string;
}

/** Realtime broadcast payload — kept tiny so we can fire it at 1 Hz. */
export interface DuelProgressEvent {
  userId: string;
  score: number;
  progressPercent: number;
  completedUnits?: { rows?: number; cols?: number; boxes?: number };
  mistakes?: number;
  hints?: number;
  finished?: boolean;
  /** Server-clock timestamp from the publisher. */
  ts: number;
}

/** Outcome of `submit_duel_attempt`. */
export interface SubmitDuelResult {
  completed: boolean;
  winnerId: string | null;
  attempts: number;
}
