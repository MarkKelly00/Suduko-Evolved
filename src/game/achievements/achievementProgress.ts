/**
 * Local "already reported at 100%" tracker for Game Center achievements.
 *
 * GameKit silently de-dupes on its side — submitting an achievement at
 * 100% twice is harmless — but we still want to skip those submissions
 * for two reasons:
 *
 *   1. Network. Each call is a round-trip. Spamming GameKit on every
 *      level completion (which would re-submit "First Bloom" forever)
 *      is wasteful, especially when the player has limited connectivity.
 *
 *   2. The offline queue. If we keep enqueueing 100%-already-done
 *      achievements while offline, the queue fills up with no-ops that
 *      compete with real new achievements for the 200-entry cap.
 *
 * The wrapper exposes `reportAchievementsWithProgress()` which:
 *   - Filters out submissions whose ID is already marked reported.
 *   - Calls gameCenterService.reportAchievements() on the survivors.
 *   - Marks any successfully delivered 100%-submission as reported.
 *   - Pads the result array back to original length so callers can map
 *     1:1 if they want.
 *
 * Persistence: same MMKV-backed `getStorage()` as everything else. Key
 * is reset by `clearReportedAchievements()` (used by the dev-only
 * achievement reset path).
 */

import { getStorage } from '@/services/persistence/storage';
import { useAchievementToastStore } from '@/game/state/useAchievementToastStore';
import {
  gameCenterService,
  type AchievementSubmission,
  type GameCenterAchievementId,
  type SubmissionOutcome,
} from '@/services/gameCenter';

const KEY = 'gameCenter.reportedAchievements';

function readReported(): string[] {
  return getStorage().get<string[]>(KEY, []);
}

function writeReported(ids: string[]): void {
  getStorage().set<string[]>(KEY, ids);
}

export function isReported(id: GameCenterAchievementId): boolean {
  return readReported().includes(id);
}

export function markReported(id: GameCenterAchievementId): void {
  const cur = readReported();
  if (cur.includes(id)) return;
  cur.push(id);
  writeReported(cur);
}

export function clearReportedAchievements(): void {
  writeReported([]);
}

/** Idempotent + dedup-aware achievement reporter. The single entry
 *  point every call site should use. */
export async function reportAchievementsWithProgress(
  submissions: AchievementSubmission[],
): Promise<SubmissionOutcome[]> {
  if (submissions.length === 0) return [];

  // Pre-filter against the local "already at 100%" set.
  const survivors: AchievementSubmission[] = [];
  const survivorIndexInOriginal: number[] = [];
  submissions.forEach((s, i) => {
    if (!isReported(s.achievementId)) {
      survivors.push(s);
      survivorIndexInOriginal.push(i);
    }
  });

  // All submissions were already-reported — short-circuit.
  if (survivors.length === 0) {
    return submissions.map(() => ({
      ok: true,
      delivered: false,
      reason: 'already-reported',
    }));
  }

  const outcomes = await gameCenterService.reportAchievements(survivors);

  // Mark any successfully-delivered 100% submissions as reported so
  // future calls skip them. Also enqueue the in-app unlock toast — this
  // fires exactly once per achievement (the next reportAchievements call
  // for the same ID is dropped earlier by isReported()), so the toast
  // store can't replay yesterday's unlocks across launches.
  outcomes.forEach((outcome, i) => {
    const submission = survivors[i]!;
    if (outcome.delivered && submission.percentComplete >= 100) {
      markReported(submission.achievementId);
      useAchievementToastStore.getState().enqueue(submission.achievementId);
    }
  });

  // Pad outcomes back to original length so callers can map 1:1 onto
  // the input submissions list.
  const padded: SubmissionOutcome[] = submissions.map(() => ({
    ok: true,
    delivered: false,
    reason: 'already-reported',
  }));
  survivorIndexInOriginal.forEach((origIdx, i) => {
    padded[origIdx] = outcomes[i]!;
  });
  return padded;
}
