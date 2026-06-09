/**
 * Local-to-cloud progress sync. Fires when a guest signs in for the first
 * time on a device — pushes any local bests that strictly beat the cloud
 * snapshot, then records `lastSyncedFor:<userId>` so re-logins on the same
 * device don't re-run the migration (which would NOT cause data loss
 * thanks to "best-of-best" merge semantics, but would cause unnecessary
 * cloud writes).
 *
 * XP is reconciled with `set_profile_xp_max(p_user_id, candidate)` —
 * cloud XP becomes max(local, cloud). It's NEVER additive, so re-logins
 * cannot inflate XP.
 *
 * Aggregates (stars_total, crowns_total, levels_cleared, best_time_trial_score)
 * are server-derived via `update_profile_aggregates(p_user_id)` after the
 * push, so we don't need to mirror them.
 */

import { useProgressStore } from '@/game/state/useProgressStore';
import { useAuthStore } from '@/game/state/useAuthStore';
import { getStorage } from '@/services/persistence/storage';
import { lastSyncedKey } from '@/services/persistence/schema';
import { getSupabase } from '@/services/supabase/supabaseClient';
import { scoreSubmissionService } from '@/services/supabase';
import { effectiveStreak } from '@/game/util/streakDate';
import { serializeLevelEntry, serializeTimeTrialBest } from './scoreSerializer';
import { drainPendingSubmissions } from './pendingSubmissionsQueue';

/**
 * Push the player's current effective day-streak (+ the local date it was last
 * advanced on) to the cloud via `set_profile_streak`, so it persists across
 * reinstalls and shows on friends' profiles. Fire-and-forget and safe to call
 * on every solve and on each sign-in sync: a no-op when unauthenticated, when
 * Supabase is unconfigured, or before the player has any streak date. The RPC
 * only advances the cloud value when this date is >= the stored one, so a
 * stale device can't clobber a fresher streak.
 */
export async function uploadProfileStreak(userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const uid = userId ?? useAuthStore.getState().profile?.id;
  if (!uid) return;
  const { currentStreak, lastStreakDate } = useProgressStore.getState();
  if (!lastStreakDate) return;
  try {
    await supabase.rpc('set_profile_streak', {
      p_user_id: uid,
      p_streak: effectiveStreak(currentStreak, lastStreakDate),
      p_last_date: lastStreakDate,
    });
  } catch {
    // Best-effort — re-syncs on the next solve / sign-in.
  }
}

export interface SyncResult {
  uploadedLevels: number;
  uploadedTtRuns: number;
  xpReconciled: 'kept-cloud' | 'kept-local' | 'unchanged' | 'skipped';
  errors: string[];
}

interface BestLevelRow {
  level_id: string;
  score: number;
  time_ms: number;
  stars: number;
}
interface BestTtRow {
  mode: string;
  period_key: string;
  score: number;
  time_ms: number;
}

export async function runLocalToCloudSync(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    uploadedLevels: 0,
    uploadedTtRuns: 0,
    xpReconciled: 'unchanged',
    errors: [],
  };
  const supabase = getSupabase();
  if (!supabase) {
    result.errors.push('Supabase not configured');
    return result;
  }

  const auth = useAuthStore.getState();
  auth.setSyncStatus('running');

  try {
    const storage = getStorage();
    const alreadySynced = storage.get<number | undefined>(lastSyncedKey(userId), undefined);
    const local = useProgressStore.getState();

    // 1. Fetch cloud bests for the user.
    const { data: cloudLevels, error: e1 } = await supabase
      .from('best_level_scores')
      .select('level_id, score, time_ms, stars')
      .eq('user_id', userId);
    if (e1) result.errors.push(`best_level_scores: ${e1.message}`);
    const cloudLevelMap = new Map<string, BestLevelRow>();
    for (const r of (cloudLevels ?? []) as BestLevelRow[]) {
      cloudLevelMap.set(r.level_id, r);
    }

    const { data: cloudTt, error: e2 } = await supabase
      .from('best_time_trial_scores')
      .select('mode, period_key, score, time_ms')
      .eq('user_id', userId);
    if (e2) result.errors.push(`best_time_trial_scores: ${e2.message}`);
    const cloudTtMap = new Map<string, BestTtRow>();
    for (const r of (cloudTt ?? []) as BestTtRow[]) {
      cloudTtMap.set(`${r.mode}::${r.period_key}`, r);
    }

    // 2. Push local level bests that beat cloud.
    for (const [levelId, entry] of Object.entries(local.levels)) {
      const cloud = cloudLevelMap.get(levelId);
      const localBeats =
        cloud == null ||
        entry.stars > cloud.stars ||
        (entry.stars === cloud.stars && entry.bestScore > cloud.score) ||
        (entry.stars === cloud.stars &&
          entry.bestScore === cloud.score &&
          entry.bestTime * 1000 < cloud.time_ms);
      if (!localBeats) continue;
      const submission = serializeLevelEntry(levelId, entry);
      if (!submission) continue;
      try {
        await scoreSubmissionService.submitLevelScore(submission);
        result.uploadedLevels++;
      } catch (err) {
        result.errors.push(
          `level ${levelId}: ${err instanceof Error ? err.message : 'failed'}`,
        );
      }
    }

    // 3. Push local TT bests that beat cloud.
    for (const [modeId, best] of Object.entries(local.timeTrialBests)) {
      const key = `${modeId}::`; // empty period_key for all-time bucket
      const cloud = cloudTtMap.get(key);
      const localBeats =
        cloud == null ||
        best.score > cloud.score ||
        (best.score === cloud.score && best.time * 1000 < (cloud.time_ms ?? Infinity));
      if (!localBeats) continue;
      // We don't have the original puzzle seed cached locally — fall back
      // to a marker that the row is from a sync.
      const submission = serializeTimeTrialBest(modeId, best, `local-sync-${modeId}`);
      try {
        await scoreSubmissionService.submitTimeTrialScore(submission);
        result.uploadedTtRuns++;
      } catch (err) {
        result.errors.push(
          `tt ${modeId}: ${err instanceof Error ? err.message : 'failed'}`,
        );
      }
    }

    // 4. XP reconciliation — only on first sync per device per account.
    if (alreadySynced == null) {
      try {
        const { error: e3 } = await supabase.rpc('set_profile_xp_max', {
          p_user_id: userId,
          p_candidate: local.totalXP,
        });
        if (e3) result.errors.push(`xp: ${e3.message}`);
        result.xpReconciled = 'kept-local';
      } catch (err) {
        result.errors.push(
          `xp: ${err instanceof Error ? err.message : 'failed'}`,
        );
      }
    } else {
      result.xpReconciled = 'skipped';
    }

    // 4b. Streak — push the current effective day-streak on every sync (it
    // changes daily, unlike XP, so it's not gated by `alreadySynced`).
    await uploadProfileStreak(userId);

    // 5. Drain any queued submissions in the same pass.
    await drainPendingSubmissions();

    // 6. Mark synced if everything succeeded.
    if (result.errors.length === 0) {
      storage.set(lastSyncedKey(userId), Date.now());
    }

    auth.setSyncStatus(result.errors.length === 0 ? 'done' : 'error');
    return result;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'unknown');
    auth.setSyncStatus('error');
    return result;
  }
}
