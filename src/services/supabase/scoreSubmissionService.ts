/**
 * Score submission to Supabase. Replaces the local-only path in
 * src/services/social/leaderboardService.ts (which is rewritten as a thin
 * shim during Phase 8).
 *
 * Each submission is one row inserted into level_scores or time_trial_scores.
 * Aggregates on the profiles row (stars_total, crowns_total, levels_cleared,
 * best_time_trial_score) are recomputed by the RPC update_profile_aggregates.
 *
 * Game Center submission happens in parallel as a fire-and-forget (best-effort).
 *
 * The pending-submissions retry queue is wired in Phase 8; for now, a network
 * failure surfaces as a thrown error and the local UI continues unchanged.
 */

import { getSupabase } from './supabaseClient';

export interface LevelScoreSubmission {
  levelId: string;
  puzzleSeed: string;
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
  stars: 1 | 2 | 3;
  crown: boolean;
  moveCount?: number | null;
}

export interface TimeTrialScoreSubmission {
  modeId: string;
  puzzleSeed: string;
  periodKey?: string;
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
  moveCount?: number | null;
}

export interface SubmissionResult {
  remoteId: string | null;
}

export async function submitLevelScore(
  input: LevelScoreSubmission,
): Promise<SubmissionResult> {
  const supabase = getSupabase();
  if (!supabase) return { remoteId: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { remoteId: null };

  const { data, error } = await supabase
    .from('level_scores')
    .insert({
      user_id: user.id,
      level_id: input.levelId,
      puzzle_seed: input.puzzleSeed,
      score: input.score,
      time_ms: Math.round(input.timeSeconds * 1000),
      mistakes: input.mistakes,
      hints: input.hints,
      stars: input.stars,
      crown: input.crown,
      move_count: input.moveCount ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  // Recompute aggregates server-side (don't block on failure).
  void supabase.rpc('update_profile_aggregates', { p_user_id: user.id });
  return { remoteId: (data as { id: string }).id };
}

export async function submitTimeTrialScore(
  input: TimeTrialScoreSubmission,
): Promise<SubmissionResult> {
  const supabase = getSupabase();
  if (!supabase) return { remoteId: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { remoteId: null };

  const { data, error } = await supabase
    .from('time_trial_scores')
    .insert({
      user_id: user.id,
      mode: input.modeId,
      period_key: input.periodKey ?? '',
      puzzle_seed: input.puzzleSeed,
      score: input.score,
      time_ms: Math.round(input.timeSeconds * 1000),
      mistakes: input.mistakes,
      hints: input.hints,
    })
    .select('id')
    .single();
  if (error) throw error;

  void supabase.rpc('update_profile_aggregates', { p_user_id: user.id });
  return { remoteId: (data as { id: string }).id };
}
