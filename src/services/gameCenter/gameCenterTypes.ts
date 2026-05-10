/**
 * Public domain types for the Game Center service layer.
 *
 * These are what the rest of the app deals with — game flows, UI
 * surfaces, tests. They're a thin shell over the native module's
 * raw types (in `modules/expo-game-center/src/types.ts`) plus a few
 * higher-level shapes (queue entries, init result) that don't live
 * on the native side.
 */

import type {
  GameCenterAchievementId,
  GameCenterLeaderboardId,
} from './gameCenterIds';

// ─── Player ────────────────────────────────────────────────────────────────

export interface GameCenterPlayer {
  /** Display name shown by Apple (alias or full name based on the
   *  player's Game Center privacy setting). May be null if Apple is
   *  withholding it. */
  displayName: string | null;
  /** Apple's per-app stable identifier. Compare across launches; never
   *  store anywhere user-discoverable (per App Store guidelines). */
  gamePlayerID: string | null;
  /** Apple's per-game-team stable identifier. Null if disabled. */
  teamPlayerID: string | null;
  /** Public alias the player chose in Game Center settings. */
  alias: string | null;
}

// ─── Result wrappers — uniform shape so callers can branch on `.ok` ────────

export interface InitializeResult {
  /** True if Game Center was initialized successfully (or platform was
   *  not iOS, in which case the layer is a deliberate no-op). False
   *  only when something unexpected went wrong loading the native
   *  module on a presumed-iOS build. */
  ok: boolean;
  /** Whether the integration is even applicable. False on Android, web,
   *  iOS builds without the native module compiled in, etc. */
  available: boolean;
  /** Whether the local player is currently authenticated. Always false
   *  in Phase 1 stub; may be false on Phase 2+ if user hasn't opted in. */
  authenticated: boolean;
  reason?: string;
}

export interface AuthenticateOutcome {
  ok: boolean;
  authenticated: boolean;
  /** GameKit needed to present a sign-in sheet but `presentSignIn` was
   *  false. Caller should retry with true on explicit user action. */
  requiresSignIn?: boolean;
  player?: GameCenterPlayer | null;
  reason?: string;
}

export interface SubmissionOutcome {
  ok: boolean;
  /** True only after Apple ack'd. False means queued OR no-op'd. */
  delivered: boolean;
  /** Set when the call was deferred to the offline queue. */
  queued?: boolean;
  reason?: string;
}

export interface ShowResult {
  ok: boolean;
  presented: boolean;
  reason?: string;
}

// ─── Domain submission inputs — drives leaderboardSubmissions.ts ───────────

/** A single leaderboard score submission. */
export interface LeaderboardSubmission {
  leaderboardId: GameCenterLeaderboardId;
  /** Integer value in the leaderboard's native unit. For time-based
   *  leaderboards (SPRINT_FASTEST_CLEAR), this is milliseconds. */
  value: number;
}

/** A single achievement progress report. */
export interface AchievementSubmission {
  achievementId: GameCenterAchievementId;
  /** 0–100. Apple unlocks an achievement only when it reaches 100. */
  percentComplete: number;
}

// ─── Offline queue entry shape ─────────────────────────────────────────────

export type QueueEntryKind = 'score' | 'achievement';

interface QueueEntryBase {
  /** Crypto-random ID, used for dedupe + retry-cap tracking. */
  id: string;
  /** Epoch ms when first enqueued. Stale entries (>30 days) drop on drain. */
  enqueuedAt: number;
  /** Bumped on each failed drain attempt. Capped per the queue config. */
  retryCount: number;
  /** Epoch ms of last attempted drain. Used by retry/back-off logic. */
  lastAttemptAt: number;
}

export interface ScoreQueueEntry extends QueueEntryBase {
  kind: 'score';
  payload: LeaderboardSubmission;
}

export interface AchievementQueueEntry extends QueueEntryBase {
  kind: 'achievement';
  payload: AchievementSubmission;
}

export type QueueEntry = ScoreQueueEntry | AchievementQueueEntry;
