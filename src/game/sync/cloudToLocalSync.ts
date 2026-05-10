/**
 * Cloud → local progress sync.
 *
 * Counterpart to localToCloudSync. Fetches the user's bests from
 * Supabase and applies them to the local progress store via
 * best-of-best merge semantics. Together with the wipe-on-signout
 * behaviour in App.tsx, this guarantees that when user B signs in
 * after user A on the same device, B sees only B's progress —
 * never inherits A's local data.
 *
 * Order of operations on sign-in (in App.tsx):
 *   1. localToCloudSync — pushes any local-better-than-cloud entries
 *      up. Handles the guest-migration case (guest plays, signs in
 *      for the first time, their guest progress migrates to cloud).
 *   2. cloudToLocalSync — pulls the user's full set of bests down
 *      and merges into local. Handles every other case:
 *        - new user on a wiped device → restore from cloud
 *        - same user, multi-device → backfill cross-device wins
 *        - same user, post-wipe → restore from cloud
 *
 * Best-of-best is the safe semantics either way: identical entries
 * collapse cleanly, and when the user is offline this whole call
 * resolves to a no-op (no exception thrown — the sync just reports
 * "Supabase not configured" or returns errors).
 */

import { useProgressStore } from '@/game/state/useProgressStore';
import { getSupabase } from '@/services/supabase/supabaseClient';
import type {
  ProgressLevelEntry,
  TimeTrialBest,
} from '@/services/persistence/schema';

export interface CloudSyncResult {
  /** Number of cloud level rows applied to the local store. */
  levelsRestored: number;
  /** Number of cloud time-trial rows applied. */
  ttRestored: number;
  /** Cloud XP value at sync time (after max(local, cloud) merge). */
  xpRestored: number;
  /** Cloud streak value at sync time (after max(local, cloud) merge).
   *  Note: as of build 12, no code path uploads streak to the cloud,
   *  so this will be 0 for every user. The fetch is wired up defensively
   *  for when a streak-upload path lands later. */
  streakRestored: number;
  errors: string[];
}

/** Cloud row shape from `best_level_scores` view (db/004_views.sql). */
interface CloudLevelRow {
  level_id: string;
  score: number;
  time_ms: number;
  stars: number;
  crown: boolean | null;
  completed_at: string | null;
}

/** Cloud row shape from `best_time_trial_scores` view. */
interface CloudTtRow {
  mode: string;
  period_key: string;
  score: number;
  time_ms: number;
  completed_at: string | null;
}

interface CloudProfile {
  xp: number | null;
  streak: number | null;
}

export async function runCloudToLocalSync(
  userId: string,
): Promise<CloudSyncResult> {
  const result: CloudSyncResult = {
    levelsRestored: 0,
    ttRestored: 0,
    xpRestored: 0,
    streakRestored: 0,
    errors: [],
  };
  const supabase = getSupabase();
  if (!supabase) {
    result.errors.push('Supabase not configured');
    return result;
  }

  // 1. Best per-level scores
  const { data: cloudLevels, error: e1 } = await supabase
    .from('best_level_scores')
    .select('level_id, score, time_ms, stars, crown, completed_at')
    .eq('user_id', userId);
  if (e1) result.errors.push(`best_level_scores: ${e1.message}`);

  // 2. Best time-trial scores (only the all-time bucket is relevant
  // to the local progress store — period-keyed buckets like daily
  // would clutter the store and aren't displayed anywhere).
  const { data: cloudTt, error: e2 } = await supabase
    .from('best_time_trial_scores')
    .select('mode, period_key, score, time_ms, completed_at')
    .eq('user_id', userId);
  if (e2) result.errors.push(`best_time_trial_scores: ${e2.message}`);

  // 3. Profile XP + streak. Column names match the actual schema in
  // db/001_schema.sql — `xp` (not `total_xp`) and `streak`. Earlier
  // builds queried `total_xp` which doesn't exist; the query errored
  // silently, the value defaulted to 0, and signing back in wiped a
  // returning user's XP. This was the bug surfaced by mako3's
  // post-resignin profile showing 0 XP despite cloud having 2819.
  const { data: profile, error: e3 } = await supabase
    .from('profiles')
    .select('xp, streak')
    .eq('id', userId)
    .maybeSingle();
  if (e3) result.errors.push(`profile: ${e3.message}`);

  // 4. Convert cloud rows → local entry shapes
  const levels: Record<string, ProgressLevelEntry> = {};
  for (const row of (cloudLevels ?? []) as CloudLevelRow[]) {
    const stars = clampStars(row.stars);
    const completedAt = row.completed_at
      ? Date.parse(row.completed_at)
      : Date.now();
    levels[row.level_id] = {
      stars,
      crown: row.crown === true,
      bestScore: row.score,
      bestTime: row.time_ms / 1000,
      completedAt: Number.isFinite(completedAt) ? completedAt : Date.now(),
    };
    result.levelsRestored++;
  }

  const timeTrialBests: Record<string, TimeTrialBest> = {};
  for (const row of (cloudTt ?? []) as CloudTtRow[]) {
    // Only the all-time bucket — same convention as localToCloudSync.
    if (row.period_key !== '') continue;
    const date = row.completed_at
      ? Date.parse(row.completed_at)
      : Date.now();
    timeTrialBests[row.mode] = {
      score: row.score,
      time: row.time_ms / 1000,
      date: Number.isFinite(date) ? date : Date.now(),
    };
    result.ttRestored++;
  }

  const cloudProfile = profile as CloudProfile | null;
  const totalXP = Math.max(0, cloudProfile?.xp ?? 0);
  const currentStreak = Math.max(0, cloudProfile?.streak ?? 0);
  result.xpRestored = totalXP;
  result.streakRestored = currentStreak;

  // 5. Apply merge to local store
  useProgressStore.getState().restoreFromCloud({
    levels,
    timeTrialBests,
    totalXP,
    currentStreak,
  });

  return result;
}

function clampStars(value: number | null | undefined): 1 | 2 | 3 {
  if (value == null || !Number.isFinite(value)) return 1;
  if (value >= 3) return 3;
  if (value >= 2) return 2;
  return 1;
}
