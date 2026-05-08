/**
 * Friend duels (direct invite to a chosen friend) and shareable duel
 * links (public invite_code, anyone with the link can redeem).
 */
import { getSupabase } from '@/services/supabase/supabaseClient';
import type {
  DuelInvite,
  Json,
  Profile,
} from '@/services/supabase/supabaseTypes';
import type {
  DuelLinkHandle,
  FriendDuelHandle,
  RedeemedInvite,
} from './types';

interface FriendDuelPayload {
  invite_id?: string;
  invite_code?: string;
  mode?: string;
  opponent_id?: string;
  expires_at?: string;
}
interface DuelLinkPayload {
  invite_id?: string;
  invite_code?: string;
  mode?: string;
  share_url?: string;
  expires_at?: string;
}
interface RedeemPayload {
  room_id?: string;
  puzzle_seed?: string;
  mode?: string;
  start_at?: string;
  challenger_id?: string;
  opponent_id?: string;
}

function asObject(json: Json | null): Record<string, unknown> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as Record<string, unknown>;
}

export async function createFriendDuel(
  opponentId: string,
  mode: string,
): Promise<FriendDuelHandle> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('create_friend_duel', {
    p_opponent_id: opponentId,
    p_mode: mode,
  });
  if (error) throw error;
  const j = asObject(data) as FriendDuelPayload;
  if (!j.invite_id || !j.invite_code || !j.mode || !j.opponent_id || !j.expires_at) {
    throw new Error('Malformed friend duel response');
  }
  return {
    inviteId: j.invite_id,
    inviteCode: j.invite_code,
    mode: j.mode,
    opponentId: j.opponent_id,
    expiresAt: j.expires_at,
  };
}

export async function createDuelLink(mode: string): Promise<DuelLinkHandle> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('create_duel_link', {
    p_mode: mode,
  });
  if (error) throw error;
  const j = asObject(data) as DuelLinkPayload;
  if (!j.invite_id || !j.invite_code || !j.mode || !j.share_url || !j.expires_at) {
    throw new Error('Malformed duel link response');
  }
  return {
    inviteId: j.invite_id,
    inviteCode: j.invite_code,
    mode: j.mode,
    shareUrl: j.share_url,
    expiresAt: j.expires_at,
  };
}

export async function redeemDuelInvite(
  inviteCode: string,
): Promise<RedeemedInvite> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('redeem_duel_invite', {
    p_invite_code: inviteCode,
  });
  if (error) throw error;
  const j = asObject(data) as RedeemPayload;
  if (
    !j.room_id ||
    !j.puzzle_seed ||
    !j.mode ||
    !j.start_at ||
    !j.challenger_id ||
    !j.opponent_id
  ) {
    throw new Error('Malformed invite redemption response');
  }
  return {
    roomId: j.room_id,
    puzzleSeed: j.puzzle_seed,
    mode: j.mode,
    startAt: j.start_at,
    challengerId: j.challenger_id,
    opponentId: j.opponent_id,
  };
}

export async function getIncomingFriendDuels(): Promise<
  (DuelInvite & { challenger: Profile | null })[]
> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('duel_invites')
    .select('*, challenger:profiles!duel_invites_challenger_id_fkey(*)')
    .eq('opponent_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[duelInviteService.getIncomingFriendDuels]', error.message);
    return [];
  }
  return (data ?? []) as unknown as (DuelInvite & { challenger: Profile | null })[];
}

export async function declineDuelInvite(inviteId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // Direct update is allowed because RLS lets the opponent read their own
  // invites; we'll restrict updates further if abuse appears. For now the
  // SECURITY DEFINER redeem path is the canonical accept; decline is just a
  // status flip on the row owned by the opponent.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('duel_invites')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('opponent_id', user.id);
}
