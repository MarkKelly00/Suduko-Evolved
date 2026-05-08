/**
 * Final attempt submission + heartbeat ping + forfeit. All write paths go
 * through SECURITY DEFINER RPCs so we can stamp the immutable attempt
 * row, transition the room, and resolve the winner atomically.
 */
import { getSupabase } from '@/services/supabase/supabaseClient';
import type { Json } from '@/services/supabase/supabaseTypes';
import type { SubmitDuelResult } from './types';

export interface SubmitDuelAttemptInput {
  roomId: string;
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
  stars?: 1 | 2 | 3 | null;
  crown?: boolean;
  moveCount?: number | null;
  finalGrid?: number[] | null;
  appBackgroundCount?: number;
  reconnectCount?: number;
}

interface SubmitPayload {
  completed?: boolean;
  winner_id?: string | null;
  attempts?: number;
}

function asObject(json: Json | null): SubmitPayload {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as SubmitPayload;
}

export async function submitDuelAttempt(
  input: SubmitDuelAttemptInput,
): Promise<SubmitDuelResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('submit_duel_attempt', {
    p_room_id: input.roomId,
    p_score: input.score,
    p_time_ms: Math.max(0, Math.round(input.timeSeconds * 1000)),
    p_mistakes: input.mistakes,
    p_hints: input.hints,
    p_stars: input.stars ?? undefined,
    p_crown: input.crown ?? false,
    p_move_count: input.moveCount ?? undefined,
    p_final_grid: input.finalGrid
      ? (input.finalGrid as unknown as Json)
      : undefined,
    p_app_background_count: input.appBackgroundCount ?? 0,
    p_reconnect_count: input.reconnectCount ?? 0,
  });
  if (error) throw error;
  const p = asObject(data);
  return {
    completed: p.completed ?? false,
    winnerId: p.winner_id ?? null,
    attempts: p.attempts ?? 0,
  };
}

export interface HeartbeatPayload {
  roomId: string;
  score: number;
  progressPercent: number;
  completedUnits?: { rows?: number; cols?: number; boxes?: number };
}

export async function sendDuelHeartbeat(payload: HeartbeatPayload): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc('heartbeat_duel', {
    p_room_id: payload.roomId,
    p_score: payload.score,
    p_progress_percent: payload.progressPercent,
    p_completed_units: payload.completedUnits
      ? (payload.completedUnits as unknown as Json)
      : undefined,
  });
  if (error && __DEV__) {
    // Heartbeats are best-effort; surface in dev only.
    console.warn('[duelSubmissionService.heartbeat]', error.message);
  }
}

export async function forfeitDuel(roomId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc('forfeit_duel', { p_room_id: roomId });
  if (error) throw error;
}
