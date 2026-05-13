/**
 * Wrapper around the `mark_duel_ready` Postgres RPC.
 *
 * The duel lobby calls this once per session on mount. The RPC flips
 * the caller's `duel_participants.ready_at`; if BOTH participants are
 * now ready, it also rewrites the room's `start_at` to `now + 5s` and
 * promotes status from 'matched' → 'countdown'.
 *
 * Idempotent: calling twice is a no-op because the SQL uses
 * `COALESCE(ready_at, now())`.
 */

import { getSupabase } from '@/services/supabase/supabaseClient';

export interface MarkDuelReadyResult {
  bothReady: boolean;
  /** Server-authoritative start timestamp — clients should drive the
   *  countdown from this, NOT from any param they were navigated with. */
  startAt: string | null;
}

export async function markDuelReady(
  roomId: string,
): Promise<MarkDuelReadyResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  // The generated SupabaseTypes haven't been regenerated since the
  // `mark_duel_ready` migration landed — fall through `any` until the
  // next codegen pass.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client.rpc('mark_duel_ready', {
    p_room_id: roomId,
  });
  if (error) {
    if (__DEV__) console.warn('[markDuelReady]', error.message);
    return null;
  }
  // RPC returns jsonb: { both_ready, start_at }
  const row = data as unknown as
    | { both_ready?: boolean; start_at?: string }
    | null;
  if (!row || typeof row !== 'object') return null;
  return {
    bothReady: row.both_ready === true,
    startAt: row.start_at ?? null,
  };
}
