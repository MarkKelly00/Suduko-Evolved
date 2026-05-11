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
 *
 * Must match the iOS app's `levelId(index)` format (see
 * src/game/content/levels.ts:46-48). Generated programmatically for all
 * 30 levels of Logic Garden so the website doesn't fall behind when
 * players grind past L5 — earlier the array was hardcoded to L1–L5 and
 * a player at L7 saw a board that capped out at L5.
 *
 * Type stays `string` rather than a template literal union so
 * downstream Record types resolve to plain `Record<string, ...>` —
 * cleaner ergonomics for callers that iterate `Object.entries`.
 */
const LOGIC_GARDEN_LEVEL_COUNT = 30;
export const CAMPAIGN_LEVEL_IDS: readonly string[] = Array.from(
  { length: LOGIC_GARDEN_LEVEL_COUNT },
  (_, i) => `world1-level-${i + 1}`,
);
export type CampaignLevelId = string;

/**
 * Fetch global leaderboards for every Logic Garden level in parallel.
 * Returns a map keyed by level id. With 30 levels × max 25 rows of
 * compact JSON (≈10 small fields per row), the worst-case payload is
 * roughly ~375 KB — well within an initial-render budget — so we keep
 * sending all of it server-side and let the client switch between
 * levels instantly without extra round-trips. The 30 Supabase queries
 * fire in parallel and the ISR cache (60s) absorbs the cost.
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
 * Time-trial leaderboard for a given mode (e.g. 'sprint-3min').
 *
 * The mode identifier MUST match the value the iOS app writes to the
 * `time_trial_scores.mode` column — that's `'sprint-3min'` with a
 * HYPHEN (per `TIME_TRIAL_MODES` in src/game/modes/timeTrial.ts).
 * The earlier default of `'sprint_3min'` (underscore) returned 0
 * rows and the website's Sprint tab showed "No entries yet" forever
 * — same naming-mismatch class of bug as the older `world1-level-1`
 * vs `world1-level1` issue.
 *
 * period_key '' means all-time.
 */
export async function getTimeTrialLeaderboard(
  mode: string = 'sprint-3min',
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
