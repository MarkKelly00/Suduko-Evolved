/**
 * Public Game Center service. Single import surface for the rest of
 * the app — never reach into `expo-game-center` directly outside of
 * this module.
 *
 * Cross-cutting rules every method enforces:
 *
 *   1. Platform guard. `isPlatformIOS()` short-circuits to a typed
 *      no-op on Android / web.
 *   2. Native module guard. `isNativeModuleLoaded()` short-circuits if
 *      the iOS pod isn't compiled in (e.g. a dev build of an older
 *      commit).
 *   3. Opt-in guard. `useSettingsStore.getState().gameCenterOptIn` must
 *      be true before any GameKit call that touches Apple's servers
 *      (submit/report). UI helpers (showLeaderboard, showAchievements)
 *      bypass this and just present the native modal.
 *   4. Never throw. Every public method resolves with a uniform
 *      `{ ok: boolean, ... }` result so callers can branch without
 *      try/catch noise. Errors are logged in __DEV__ only.
 *   5. Never block. Submissions on failure go into the offline queue
 *      and drain on the next viable opportunity.
 *
 * Phase 1 of the rollout: the underlying native module is a stub
 * (returns hardcoded "unavailable"). Wiring still flows through this
 * file though — every callsite, every guard — so Phase 2 can swap the
 * Swift bodies in place without any JS change.
 */

import { getNativeGameCenter } from 'expo-game-center';
import type { SudokuGameCenterNativeModule } from 'expo-game-center';

import { useSettingsStore } from '@/game/state/useSettingsStore';
import {
  isNativeModuleLoaded,
  isPlatformIOS,
} from './gameCenterAvailability';
import {
  isAchievementRegistered,
  isLeaderboardRegistered,
} from './gameCenterIds';
import {
  drainQueue,
  enqueueAchievement,
  enqueueScore,
} from './gameCenterQueue';
import type {
  AchievementSubmission,
  AuthenticateOutcome,
  GameCenterPlayer,
  InitializeResult,
  LeaderboardSubmission,
  ShowResult,
  SubmissionOutcome,
} from './gameCenterTypes';

// ─── Internal helpers ──────────────────────────────────────────────────────

function isOptedIn(): boolean {
  try {
    return useSettingsStore.getState().gameCenterOptIn === true;
  } catch {
    // Store not yet hydrated — default to opted-out so we never submit
    // a score before the user has explicitly consented.
    return false;
  }
}

function devWarn(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[gameCenterService]', ...args);
  }
}

function nativeOrNull(): SudokuGameCenterNativeModule | null {
  if (!isPlatformIOS()) return null;
  return getNativeGameCenter();
}

// Internal raw submitters used both by the public methods and by the
// queue drainer. They DO NOT enqueue on failure — they just attempt
// and return ok/notok. The public submitScore wraps these with the
// "enqueue on fail" behaviour.
async function rawSubmitScore(
  submission: LeaderboardSubmission,
): Promise<boolean> {
  const native = nativeOrNull();
  if (!native) return false;
  try {
    const res = await native.submitScore(
      submission.leaderboardId,
      submission.value,
    );
    return res.ok && res.submitted;
  } catch (err) {
    devWarn('rawSubmitScore threw:', err);
    return false;
  }
}

async function rawReportAchievement(
  submission: AchievementSubmission,
): Promise<boolean> {
  const native = nativeOrNull();
  if (!native) return false;
  try {
    const res = await native.reportAchievement(
      submission.achievementId,
      submission.percentComplete,
    );
    return res.ok && res.submitted;
  } catch (err) {
    devWarn('rawReportAchievement threw:', err);
    return false;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * One-time bootstrap. Called from `App.tsx` after stores hydrate.
 * Does NOT pop the system sign-in sheet (that would intrude on every
 * cold start). Instead: (a) probes availability, (b) if the user has
 * already opted in, performs a silent auth (`presentSignIn: false`),
 * and (c) drains any pending offline submissions if auth was already
 * granted by Apple at the OS level.
 */
export async function initialize(): Promise<InitializeResult> {
  if (!isPlatformIOS()) {
    return {
      ok: true,
      available: false,
      authenticated: false,
      reason: 'platform-not-ios',
    };
  }
  if (!isNativeModuleLoaded()) {
    devWarn('native module not loaded — Game Center disabled this session');
    return {
      ok: false,
      available: false,
      authenticated: false,
      reason: 'native-module-missing',
    };
  }
  // Phase 1: native is a stub returning available=false. Even so we
  // walk through the same shape Phase 2 will use, so the flow shape is
  // already correct.
  const native = nativeOrNull();
  if (!native) {
    return {
      ok: false,
      available: false,
      authenticated: false,
      reason: 'native-module-missing',
    };
  }
  let available = false;
  try {
    available = await native.isAvailable();
  } catch (err) {
    devWarn('isAvailable threw:', err);
  }
  let authenticated = false;
  if (available && isOptedIn()) {
    // Silent auth — never present the sign-in sheet from initialize().
    try {
      const res = await native.authenticate(false);
      authenticated = res.authenticated;
    } catch (err) {
      devWarn('silent authenticate threw:', err);
    }
  }
  if (authenticated) {
    void drainPendingQueue();
  }
  return { ok: true, available, authenticated };
}

export function isAvailable(): boolean {
  return isNativeModuleLoaded();
}

export async function isAuthenticated(): Promise<boolean> {
  const native = nativeOrNull();
  if (!native) return false;
  try {
    return await native.isAuthenticated();
  } catch (err) {
    devWarn('isAuthenticated threw:', err);
    return false;
  }
}

/**
 * Trigger the auth flow. Call with `presentSignIn: true` only from an
 * explicit user action (e.g. flipping the Settings toggle on). Calling
 * without the flag returns a `requiresSignIn: true` shape if Apple
 * needs UI — caller can then decide whether to escalate.
 */
export async function authenticate(
  options: { presentSignIn?: boolean } = {},
): Promise<AuthenticateOutcome> {
  if (!isPlatformIOS()) {
    return {
      ok: true,
      authenticated: false,
      reason: 'platform-not-ios',
    };
  }
  const native = nativeOrNull();
  if (!native) {
    return {
      ok: false,
      authenticated: false,
      reason: 'native-module-missing',
    };
  }
  try {
    const res = await native.authenticate(options.presentSignIn === true);
    let player: GameCenterPlayer | null = null;
    if (res.authenticated) {
      try {
        player = (await native.getLocalPlayer()) ?? null;
      } catch {
        player = null;
      }
      // Drain any pending queue immediately on a fresh auth — this is
      // the most common path to "queue accumulated while logged out".
      void drainPendingQueue();
    }
    return {
      ok: true,
      authenticated: res.authenticated,
      requiresSignIn: res.requiresSignIn,
      player,
      reason: res.error,
    };
  } catch (err) {
    devWarn('authenticate threw:', err);
    return {
      ok: false,
      authenticated: false,
      reason: 'native-error',
    };
  }
}

export async function getLocalPlayer(): Promise<GameCenterPlayer | null> {
  const native = nativeOrNull();
  if (!native) return null;
  try {
    return (await native.getLocalPlayer()) ?? null;
  } catch (err) {
    devWarn('getLocalPlayer threw:', err);
    return null;
  }
}

/**
 * Submit a single score. On failure (network, not authed, native
 * unavailable) the submission is enqueued for retry on next viable
 * opportunity. Never blocks. Never throws.
 */
export async function submitScore(
  submission: LeaderboardSubmission,
): Promise<SubmissionOutcome> {
  if (!isPlatformIOS()) {
    return { ok: true, delivered: false, reason: 'platform-not-ios' };
  }
  if (!isOptedIn()) {
    return { ok: true, delivered: false, reason: 'opted-out' };
  }
  if (!isLeaderboardRegistered(submission.leaderboardId)) {
    // The id isn't created in App Store Connect yet (e.g. an Astral Nexus
    // leaderboard before the operator registers it). No submit, and NO
    // enqueue — we never want to retry a submission to a non-existent id.
    devWarn('skipping unregistered leaderboard', submission.leaderboardId);
    return { ok: true, delivered: false, reason: 'unregistered' };
  }
  if (!isNativeModuleLoaded()) {
    enqueueScore(submission);
    return { ok: true, delivered: false, queued: true, reason: 'unavailable' };
  }
  const ok = await rawSubmitScore(submission);
  if (ok) {
    // Opportunistically drain — a successful submit means we're in a
    // good window for catching up on previously-failed entries.
    void drainPendingQueue();
    return { ok: true, delivered: true };
  }
  enqueueScore(submission);
  return { ok: true, delivered: false, queued: true, reason: 'submit-failed' };
}

export async function submitScores(
  submissions: LeaderboardSubmission[],
): Promise<SubmissionOutcome[]> {
  return Promise.all(submissions.map(submitScore));
}

export async function reportAchievement(
  submission: AchievementSubmission,
): Promise<SubmissionOutcome> {
  if (!isPlatformIOS()) {
    return { ok: true, delivered: false, reason: 'platform-not-ios' };
  }
  if (!isOptedIn()) {
    return { ok: true, delivered: false, reason: 'opted-out' };
  }
  if (!isAchievementRegistered(submission.achievementId)) {
    // Not yet created in App Store Connect — skip without enqueueing.
    devWarn('skipping unregistered achievement', submission.achievementId);
    return { ok: true, delivered: false, reason: 'unregistered' };
  }
  if (!isNativeModuleLoaded()) {
    enqueueAchievement(submission);
    return { ok: true, delivered: false, queued: true, reason: 'unavailable' };
  }
  const ok = await rawReportAchievement(submission);
  if (ok) {
    void drainPendingQueue();
    return { ok: true, delivered: true };
  }
  enqueueAchievement(submission);
  return { ok: true, delivered: false, queued: true, reason: 'submit-failed' };
}

export async function reportAchievements(
  submissions: AchievementSubmission[],
): Promise<SubmissionOutcome[]> {
  return Promise.all(submissions.map(reportAchievement));
}

// ─── Native UI ─────────────────────────────────────────────────────────────

export async function showLeaderboard(
  leaderboardId?: string,
): Promise<ShowResult> {
  const native = nativeOrNull();
  if (!native) return { ok: true, presented: false, reason: 'unavailable' };
  try {
    const res = await native.showLeaderboard(leaderboardId ?? null);
    return { ok: res.presented, presented: res.presented, reason: res.error };
  } catch (err) {
    devWarn('showLeaderboard threw:', err);
    return { ok: false, presented: false, reason: 'native-error' };
  }
}

export async function showAchievements(): Promise<ShowResult> {
  const native = nativeOrNull();
  if (!native) return { ok: true, presented: false, reason: 'unavailable' };
  try {
    const res = await native.showAchievements();
    return { ok: res.presented, presented: res.presented, reason: res.error };
  } catch (err) {
    devWarn('showAchievements threw:', err);
    return { ok: false, presented: false, reason: 'native-error' };
  }
}

export async function showGameCenterDashboard(): Promise<ShowResult> {
  const native = nativeOrNull();
  if (!native) return { ok: true, presented: false, reason: 'unavailable' };
  try {
    const res = await native.showDashboard();
    return { ok: res.presented, presented: res.presented, reason: res.error };
  } catch (err) {
    devWarn('showDashboard threw:', err);
    return { ok: false, presented: false, reason: 'native-error' };
  }
}

// ─── Dev-only ──────────────────────────────────────────────────────────────

/**
 * Wipe all achievement progress for the current player. **Destructive.**
 * Guarded with __DEV__ so the call no-ops in release builds; the Swift
 * side has a matching #if DEBUG so even a release build that somehow
 * reached this code can't reset Apple's data. Never wire this to a UI
 * users can reach.
 */
export async function resetAchievementsDevOnly(): Promise<{ ok: boolean }> {
  if (!__DEV__) return { ok: false };
  const native = nativeOrNull();
  if (!native) return { ok: false };
  try {
    const res = await native.resetAchievementsDevOnly();
    return { ok: res.ok };
  } catch (err) {
    devWarn('resetAchievementsDevOnly threw:', err);
    return { ok: false };
  }
}

// ─── Queue glue ────────────────────────────────────────────────────────────

/** Drain any pending offline submissions. Called automatically on
 *  successful auth and after each successful submit; safe to call
 *  manually too. */
export async function drainPendingQueue(): Promise<void> {
  if (!isOptedIn()) return;
  const native = nativeOrNull();
  if (!native) return;
  try {
    await drainQueue({
      submitScore: rawSubmitScore,
      reportAchievement: rawReportAchievement,
    });
  } catch (err) {
    devWarn('drainPendingQueue threw:', err);
  }
}
