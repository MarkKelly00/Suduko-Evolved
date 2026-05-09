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
 * Global leaderboard for a campaign level. Defaults to world1-level-1 — must
 * match the iOS app's `levelId(index)` format (`world1-level-${index}`),
 * see src/game/content/levels.ts. Earlier this read `world1-level1` (no
 * hyphen between "level" and "1") which always returned zero rows.
 */
export async function getGlobalLeaderboard(
  levelId = 'world1-level-1',
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
 * Campaign level IDs covered by the website's leaderboard sub-selector.
 * Must match the iOS app's `levelId(index)` format (see
 * src/game/content/levels.ts:46-48). Currently only L1–L5 to mirror the
 * iOS Leaderboard screen's pill set; trivial to extend to all 30 by
 * appending more entries.
 */
export const CAMPAIGN_LEVEL_IDS = [
  'world1-level-1',
  'world1-level-2',
  'world1-level-3',
  'world1-level-4',
  'world1-level-5',
] as const;
export type CampaignLevelId = (typeof CAMPAIGN_LEVEL_IDS)[number];

/**
 * Fetch global leaderboards for all five campaign levels in parallel.
 * Returns a map keyed by level id. Bundle is small enough (5×25 rows of
 * tiny JSON) that we send all of it on the initial render and let the
 * client switch between levels instantly with no extra fetches.
 */
export async function getGlobalLeaderboardsByLevel(
  limit = 25,
): Promise<Record<CampaignLevelId, LeaderboardRow[]>> {
  const empty = Object.fromEntries(
    CAMPAIGN_LEVEL_IDS.map((id) => [id, [] as LeaderboardRow[]]),
  ) as Record<CampaignLevelId, LeaderboardRow[]>;

  const supabase = getServerSupabase();
  if (!supabase) return empty;

  const results = await Promise.all(
    CAMPAIGN_LEVEL_IDS.map((id) => getGlobalLeaderboard(id, limit)),
  );
  return Object.fromEntries(
    CAMPAIGN_LEVEL_IDS.map((id, i) => [id, results[i] ?? []]),
  ) as Record<CampaignLevelId, LeaderboardRow[]>;
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
