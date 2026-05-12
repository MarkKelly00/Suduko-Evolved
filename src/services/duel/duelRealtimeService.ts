/**
 * Realtime channels for duels.
 *
 * We use **two layers**:
 *   1. Postgres Changes on `duel_rooms` for status transitions
 *      (matched → countdown → active → completed). One per room.
 *   2. Broadcast on `duel_room:{roomId}` for high-frequency progress
 *      pings (score, progress %, completed boxes/rows). Sent ~1 Hz max.
 *
 * Broadcast payloads are small and intentionally lossy — losing a frame
 * is fine; the next one corrects the UI.
 *
 * Channels return an `unsubscribe()` cleanup callback. Call it on
 * unmount/leave to free the channel and let the underlying socket close
 * if no other channels are open.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from '@/services/supabase/supabaseClient';
import type { DuelRoom } from '@/services/supabase/supabaseTypes';
import type { DuelProgressEvent } from './types';

type Unsubscribe = () => void;

const PROGRESS_EVENT = 'duel.progress';

/**
 * Subscribe to room-level state changes (status, winner, completed_at).
 * The callback receives the latest `DuelRoom` row.
 */
export function subscribeRoomState(
  roomId: string,
  onUpdate: (room: DuelRoom) => void,
): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`duel_room_state:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'duel_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) onUpdate(payload.new as DuelRoom);
      },
    )
    .subscribe();
  return () => detach(channel);
}

/**
 * Subscribe to invite-acceptance events for the local player.
 *
 * Fires when a row in `duel_invites` filtered by the local user's
 * id as challenger transitions from `pending` to `accepted` (or
 * any status where the row's `room_id` is now populated). The
 * realtime payload includes the redeem RPC's outputs — most
 * importantly the new `room_id`, `puzzle_seed`, `start_at`, and
 * `opponent_id` — so the inviter's app can drop the user straight
 * into DuelLobby without an extra round-trip.
 *
 * Mounted once per session in App.tsx after auth hydrates.
 * Returns the unsubscribe so the listener can be cleaned up on
 * sign-out / profile change.
 */
export function subscribeInviteAcceptance(
  challengerId: string,
  onAccepted: (invite: {
    id: string;
    challenger_id: string;
    opponent_id: string | null;
    room_id: string | null;
    mode: string;
    puzzle_seed: string | null;
    status: string;
    use_count: number;
    updated_at: string | null;
  }) => void,
): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`duel_invites_accepted:${challengerId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'duel_invites',
        filter: `challenger_id=eq.${challengerId}`,
      },
      (payload) => {
        const next = payload.new as Record<string, unknown> | null;
        const prev = payload.old as Record<string, unknown> | null;
        if (!next) return;
        // Only fire when status flips INTO 'accepted'. Subsequent
        // updates to the same row (e.g. expiry sweeps) shouldn't
        // re-pop the banner.
        if (prev?.status === 'accepted') return;
        if (next.status !== 'accepted') return;
        onAccepted(
          next as unknown as Parameters<typeof onAccepted>[0],
        );
      },
    )
    .subscribe();
  return () => detach(channel);
}

/**
 * Subscribe to participant changes for a room — useful for opponent
 * heartbeat updates (current_score, progress_percent, last_seen_at).
 */
export function subscribeParticipants(
  roomId: string,
  onUpdate: (row: {
    user_id: string;
    current_score: number;
    progress_percent: number;
    status: string;
    last_seen_at: string;
    completed_units: unknown;
  }) => void,
): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`duel_room_participants:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'duel_participants',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new)
          onUpdate(payload.new as Parameters<typeof onUpdate>[0]);
      },
    )
    .subscribe();
  return () => detach(channel);
}

/**
 * Open a broadcast channel for a duel room. Returns:
 *   - publish(): send a progress event for the local player
 *   - unsubscribe(): tear down
 *
 * The `onPeer` callback fires for events from *other* peers — the
 * channel filters out our own broadcasts so the consumer doesn't have
 * to.
 */
export interface DuelBroadcast {
  publish: (event: DuelProgressEvent) => Promise<void>;
  unsubscribe: Unsubscribe;
}

export function openProgressBroadcast(
  roomId: string,
  selfUserId: string,
  onPeer: (event: DuelProgressEvent) => void,
): DuelBroadcast {
  const supabase = getSupabase();
  if (!supabase) {
    return { publish: async () => undefined, unsubscribe: () => undefined };
  }
  const channel: RealtimeChannel = supabase.channel(`duel_room:${roomId}`, {
    config: { broadcast: { self: false, ack: false } },
  });
  channel.on('broadcast', { event: PROGRESS_EVENT }, ({ payload }) => {
    const ev = payload as DuelProgressEvent;
    if (ev?.userId && ev.userId !== selfUserId) onPeer(ev);
  });
  channel.subscribe();
  return {
    publish: async (event: DuelProgressEvent) => {
      try {
        await channel.send({
          type: 'broadcast',
          event: PROGRESS_EVENT,
          payload: event,
        });
      } catch {
        // best-effort; the next event will catch up
      }
    },
    unsubscribe: () => detach(channel),
  };
}

function detach(channel: RealtimeChannel): void {
  try {
    const supabase = getSupabase();
    void channel.unsubscribe();
    void supabase?.removeChannel(channel);
  } catch {
    // ignore
  }
}
