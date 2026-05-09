/**
 * Leaderboard reads. The new cloud-backed implementation; replaces the local
 * mock at src/services/social/leaderboardService.ts (which becomes a thin
 * shim during the score-submission phase).
 */

import { getSupabase } from './supabaseClient';
import type {
  LeaderboardRow,
  TimeTrialLeaderboardRow,
  Profile,
} from './supabaseTypes';

export async function getGlobalLeaderboard(
  levelId: string,
  limit = 50,
  offset = 0,
): Promise<LeaderboardRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('global_leaderboard', {
    p_level_id: levelId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    if (__DEV__) console.warn('[leaderboardService.getGlobalLeaderboard]', error.message);
    return [];
  }
  return (data ?? []) as LeaderboardRow[];
}

export async function getFriendLeaderboard(
  userId: string,
  levelId: string,
  limit = 50,
): Promise<LeaderboardRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('friend_leaderboard', {
    p_user_id: userId,
    p_level_id: levelId,
    p_limit: limit,
  });
  if (error) {
    if (__DEV__) console.warn('[leaderboardService.getFriendLeaderboard]', error.message);
    return [];
  }
  return (data ?? []) as LeaderboardRow[];
}

export async function getTimeTrialLeaderboard(
  mode: string,
  periodKey = '',
  limit = 50,
  offset = 0,
): Promise<TimeTrialLeaderboardRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('time_trial_leaderboard', {
    p_mode: mode,
    p_period_key: periodKey,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    if (__DEV__) console.warn('[leaderboardService.getTimeTrialLeaderboard]', error.message);
    return [];
  }
  return (data ?? []) as TimeTrialLeaderboardRow[];
}

export async function getMyRank(
  levelId: string,
): Promise<{ rank: number; total: number } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('my_rank', {
    p_user_id: user.id,
    p_level_id: levelId,
  });
  if (error || !data || data.length === 0) {
    if (__DEV__ && error) console.warn('[leaderboardService.getMyRank]', error.message);
    return null;
  }
  const row = data[0] as { rank: number | null; total: number | null };
  if (row.rank == null) return null;
  return { rank: row.rank, total: row.total ?? 0 };
}

/**
 * Caller's best row for a level — richer than `LeaderboardRow` because we
 * query the underlying `level_scores` table directly (mistakes + hints are
 * stored there but not returned by the public RPC). Used by the modal's
 * "Your Best" card. Returns null when unauthenticated or no row exists;
 * the modal should then fall back to `useProgressStore.getLevelEntry()`.
 */
export interface YourBestRow {
  user_id: string;
  level_id: string;
  score: number;
  time_ms: number;
  mistakes: number;
  hints: number;
  stars: number;
  crown: boolean;
  completed_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export async function getYourBestForLevel(
  levelId: string,
): Promise<YourBestRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('level_scores')
    .select(
      'user_id, level_id, score, time_ms, mistakes, hints, stars, crown, completed_at',
    )
    .eq('user_id', user.id)
    .eq('level_id', levelId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[leaderboardService.getYourBestForLevel]', error.message);
    return null;
  }
  if (!data) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user_id: data.user_id,
    level_id: data.level_id,
    score: data.score,
    time_ms: data.time_ms,
    mistakes: data.mistakes ?? 0,
    hints: data.hints ?? 0,
    stars: data.stars ?? 0,
    crown: !!data.crown,
    completed_at: data.completed_at,
    username: profile?.username ?? '',
    display_name: profile?.display_name ?? '',
    avatar_url: profile?.avatar_url ?? '',
  };
}

/**
 * The single best score among the user's friends for a level. Returns null
 * when unauthenticated, no friends, or no friend has cleared the level.
 * Excludes the caller's own row.
 */
export async function getFriendBestForLevel(
  levelId: string,
): Promise<LeaderboardRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pull a small page from the friend leaderboard and take the first
  // non-self entry. Limit 5 is generous — typical friends are <=20.
  const rows = await getFriendLeaderboard(user.id, levelId, 5);
  return rows.find((r) => r.user_id !== user.id) ?? null;
}

/**
 * The single global #1 row for a level. Returns null when no rows exist.
 * Works unauthenticated (RLS allows anon SELECT on level_scores per
 * db/003_policies.sql).
 */
export async function getGlobalBestForLevel(
  levelId: string,
): Promise<LeaderboardRow | null> {
  const rows = await getGlobalLeaderboard(levelId, 1, 0);
  return rows[0] ?? null;
}

/**
 * For the FriendProfileScreen "mutual leaderboard" preview.
 * Returns the friend leaderboard for a level both users have completed.
 */
export async function getMutualLevelLeaderboard(
  selfId: string,
  friendId: string,
  levelId: string,
): Promise<LeaderboardRow[]> {
  return getFriendLeaderboard(selfId, levelId, 10).then((rows) =>
    rows.filter((r) => r.user_id === selfId || r.user_id === friendId),
  );
}

/**
 * For the ProfileScreen friends preview card.
 * Returns the top N friends across an aggregate of recent activity.
 * MVP implementation: sort accepted friends by xp descending.
 */
export async function getFriendsTop(n = 3): Promise<Profile[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(
      `requester:requester_id(*), addressee:addressee_id(*), requester_id, addressee_id`,
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if (error) {
    if (__DEV__) console.warn('[leaderboardService.getFriendsTop]', error.message);
    return [];
  }
  type Row = {
    requester: Profile | null;
    addressee: Profile | null;
    requester_id: string;
    addressee_id: string;
  };
  const profiles = (data as unknown as Row[])
    .map((r) => (r.requester_id === user.id ? r.addressee : r.requester))
    .filter((p): p is Profile => p != null);
  return profiles.sort((a, b) => b.xp - a.xp).slice(0, n);
}
