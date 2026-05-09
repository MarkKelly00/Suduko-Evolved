import { getServerSupabase } from './server';
import type {
  DuelInvitePreview,
  LeaderboardRow,
  PublicLevelScore,
  PublicProfile,
} from './types';

/**
 * Fetch a public profile by username. Returns null when:
 *   - Supabase is not configured (no env vars)
 *   - Username is unknown or soft-deleted
 *   - privacy_level is 'private'
 *
 * If privacy_level is 'friends', the row is returned but consumers should
 * render a limited card and avoid exposing recent-game detail.
 */
export async function getPublicProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,username,display_name,avatar_url,xp,streak,levels_cleared,stars_total,crowns_total,best_time_trial_score,privacy_level,created_at,deleted_at',
    )
    .eq('username', username)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  if (data.privacy_level === 'private') return null;
  // strip the deleted_at column before returning
  const typed = data as PublicProfile & { deleted_at: string | null };
  const { deleted_at, ...rest } = typed;
  void deleted_at;
  return rest as PublicProfile;
}

/**
 * Fetch a duel invite preview via the SECURITY DEFINER RPC. Returns only
 * safe-to-display fields. Never mutates state. The web must NOT call
 * redeem_duel_invite — that consumes the invite.
 */
export async function getDuelInvitePreview(
  inviteCode: string,
): Promise<DuelInvitePreview | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .rpc('preview_duel_invite_public', { p_invite_code: inviteCode })
    .maybeSingle();
  if (error || !data) return null;
  return data as DuelInvitePreview;
}

/**
 * Fetch a list of public level scores for a profile (recent campaign solves).
 */
export async function getRecentScoresForUser(
  userId: string,
  limit = 6,
): Promise<PublicLevelScore[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('best_level_scores')
    .select(
      'user_id,level_id,score,time_ms,mistakes,hints,stars,crown,completed_at',
    )
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as PublicLevelScore[];
}

/**
 * Global leaderboard for a campaign level. Defaults to world1-level1 for
 * the marketing-friendly default view.
 */
export async function getGlobalLeaderboard(
  levelId = 'world1-level1',
  limit = 25,
): Promise<LeaderboardRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('global_leaderboard', {
    p_level_id: levelId,
    p_limit: limit,
    p_offset: 0,
  });
  if (error || !data) return [];
  return data as LeaderboardRow[];
}

/**
 * Time-trial leaderboard for a given mode (e.g. 'sprint_3min').
 * period_key '' means all-time.
 */
export async function getTimeTrialLeaderboard(
  mode: string = 'sprint_3min',
  periodKey: string = '',
  limit = 25,
): Promise<LeaderboardRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('time_trial_leaderboard', {
    p_mode: mode,
    p_period_key: periodKey,
    p_limit: limit,
    p_offset: 0,
  });
  if (error || !data) return [];
  return data as LeaderboardRow[];
}
