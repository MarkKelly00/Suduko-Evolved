/**
 * Matchmaking entry points. All write paths go through SECURITY DEFINER
 * RPCs so we can keep the queue race-free and authoritative.
 */
import { getSupabase } from '@/services/supabase/supabaseClient';
import type { Json } from '@/services/supabase/supabaseTypes';
import type { MatchmakingResult } from './types';

interface JoinPayload {
  status: string;
  room_id?: string;
  puzzle_seed?: string;
  mode?: string;
  start_at?: string;
  opponent_slot?: number;
}

function coerceMatchmakingResult(payload: Json | null): MatchmakingResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 'searching' };
  }
  const j = payload as unknown as JoinPayload;
  if (j.status === 'matched' && j.room_id && j.puzzle_seed && j.mode && j.start_at) {
    return {
      status: 'matched',
      roomId: j.room_id,
      puzzleSeed: j.puzzle_seed,
      mode: j.mode,
      startAt: j.start_at,
      opponentSlot: (j.opponent_slot ?? 2) as 1 | 2,
    };
  }
  if (j.status === 'in_active_duel' && j.room_id) {
    return { status: 'in_active_duel', roomId: j.room_id };
  }
  return { status: 'searching' };
}

export async function joinMatchmaking(
  mode: string,
  skillBracket?: string | null,
): Promise<MatchmakingResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('join_matchmaking', {
    p_mode: mode,
    p_skill_bracket: skillBracket ?? undefined,
  });
  if (error) throw error;
  return coerceMatchmakingResult(data);
}

export async function cancelMatchmaking(mode: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc('cancel_matchmaking', { p_mode: mode });
  if (error) throw error;
}

/** Polls the user's active queue row to detect a match landed via another
 *  player joining (since the queue is RLS-locked, we just check our own row). */
export async function getActiveMatchmakingRoom(
  userId: string,
  mode: string,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('matchmaking_queue')
    .select('room_id, status')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  if (data.status === 'matched' && data.room_id) return data.room_id as string;
  return null;
}
