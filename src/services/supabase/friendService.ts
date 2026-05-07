/**
 * Friend graph operations against public.friendships.
 *
 * State machine:
 *   none -> pending (sendRequest)
 *   pending -> accepted (acceptRequest)  | declined (declineRequest)
 *   pending -> deleted (cancelRequest, requester only)
 *   accepted -> deleted (removeFriend)
 *   any -> blocked (blockUser, scaffold)
 */

import { getSupabase } from './supabaseClient';
import type { Friendship, Profile } from './supabaseTypes';

export type FriendshipStatus =
  | 'none'
  | 'pending_in'
  | 'pending_out'
  | 'accepted'
  | 'blocked';

const PROFILE_FIELDS =
  'id, username, username_normalized, display_name, avatar_path, avatar_url, ' +
  'xp, streak, levels_cleared, stars_total, crowns_total, best_time_trial_score, ' +
  'privacy_level, created_at, updated_at';

export async function sendRequest(addresseeId: string): Promise<Friendship | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (user.id === addresseeId) throw new Error('Cannot friend yourself');

  // Idempotency: if there's already a row in either direction, return it.
  const existing = await fetchExisting(user.id, addresseeId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as Friendship;
}

export async function acceptRequest(friendshipId: string): Promise<Friendship | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();
  if (error) throw error;
  return data as Friendship;
}

export async function declineRequest(friendshipId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function cancelRequest(friendshipId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  return cancelRequest(friendshipId);
}

export async function blockUser(userId: string): Promise<Friendship | null> {
  // Scaffold per plan.
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const existing = await fetchExisting(user.id, userId);
  if (existing) {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'blocked' })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as Friendship;
  }
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: userId, status: 'blocked' })
    .select()
    .single();
  if (error) throw error;
  return data as Friendship;
}

export interface FriendRow {
  friendship: Friendship;
  profile: Profile;
}

export async function getFriends(userId?: string): Promise<FriendRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = userId ?? user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(
      `*, requester:requester_id(${PROFILE_FIELDS}), addressee:addressee_id(${PROFILE_FIELDS})`,
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
  if (error) {
    if (__DEV__) console.warn('[friendService.getFriends]', error.message);
    return [];
  }
  type Row = Friendship & { requester: Profile | null; addressee: Profile | null };
  return (data as unknown as Row[])
    .map((row) => {
      const otherProfile =
        row.requester_id === uid ? row.addressee : row.requester;
      if (!otherProfile) return null;
      const { requester: _r, addressee: _a, ...friendship } = row;
      void _r;
      void _a;
      return { friendship: friendship as Friendship, profile: otherProfile };
    })
    .filter((x): x is FriendRow => x != null);
}

export interface PendingRequest {
  friendship: Friendship;
  profile: Profile;
}

export async function getIncomingRequests(): Promise<PendingRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('friendships')
    .select(`*, requester:requester_id(${PROFILE_FIELDS})`)
    .eq('status', 'pending')
    .eq('addressee_id', user.id);
  if (error) {
    if (__DEV__) console.warn('[friendService.getIncomingRequests]', error.message);
    return [];
  }
  type Row = Friendship & { requester: Profile | null };
  return (data as unknown as Row[])
    .filter((r) => r.requester != null)
    .map((r) => {
      const { requester, ...rest } = r;
      return { friendship: rest as Friendship, profile: requester as Profile };
    });
}

export async function getOutgoingRequests(): Promise<PendingRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('friendships')
    .select(`*, addressee:addressee_id(${PROFILE_FIELDS})`)
    .eq('status', 'pending')
    .eq('requester_id', user.id);
  if (error) {
    if (__DEV__) console.warn('[friendService.getOutgoingRequests]', error.message);
    return [];
  }
  type Row = Friendship & { addressee: Profile | null };
  return (data as unknown as Row[])
    .filter((r) => r.addressee != null)
    .map((r) => {
      const { addressee, ...rest } = r;
      return { friendship: rest as Friendship, profile: addressee as Profile };
    });
}

export async function getFriendshipStatus(otherUserId: string): Promise<FriendshipStatus> {
  const supabase = getSupabase();
  if (!supabase) return 'none';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'none';
  const existing = await fetchExisting(user.id, otherUserId);
  if (!existing) return 'none';
  if (existing.status === 'accepted') return 'accepted';
  if (existing.status === 'blocked') return 'blocked';
  if (existing.status === 'pending') {
    return existing.requester_id === user.id ? 'pending_out' : 'pending_in';
  }
  return 'none';
}

async function fetchExisting(a: string, b: string): Promise<Friendship | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${a},addressee_id.eq.${b}),` +
        `and(requester_id.eq.${b},addressee_id.eq.${a})`,
    )
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[friendService.fetchExisting]', error.message);
    return null;
  }
  return data as Friendship | null;
}
