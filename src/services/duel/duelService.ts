/**
 * Duel room reads. Mutations live in matchmakingService /
 * duelInviteService / duelSubmissionService — this module is read-only.
 */
import { getSupabase } from '@/services/supabase/supabaseClient';
import type {
  DuelAttempt,
  DuelParticipant,
  DuelRoom,
  Profile,
} from '@/services/supabase/supabaseTypes';

export interface DuelRoomBundle {
  room: DuelRoom;
  participants: (DuelParticipant & { profile: Profile | null })[];
  attempts: DuelAttempt[];
}

/** Detailed result so callers can distinguish "no row" from "RLS / network /
 *  PostgREST error" and surface a useful message on the spinner-screens
 *  that have plagued us across builds. */
export interface DuelRoomResult {
  bundle: DuelRoomBundle | null;
  /** When the fetch failed entirely, this carries the error message
   *  for on-device diagnostic display. */
  error: string | null;
  /** Which read path produced the bundle. Helps future regressions: if
   *  'fallback' is firing, the nested PostgREST query is broken
   *  again. */
  source: 'nested' | 'fallback' | 'none';
}

/**
 * Fetch the full duel-room bundle (room + participants + attempts).
 *
 * Two-tier strategy:
 *   1. Try the nested PostgREST select (cheap, one round-trip).
 *   2. If that errors OR returns null when a row clearly exists, fall
 *      back to three parallel single-table queries and assemble the
 *      bundle client-side.
 *
 * The fallback exists because we've seen the nested path silently fail
 * in production despite RLS being verified-correct and the data
 * verified-present — most likely a PostgREST schema-cache hiccup or a
 * network blip on the embedded resolver. Splitting into discrete
 * queries lets us localise WHICH one fails.
 */
export async function getDuelRoomDetailed(
  roomId: string,
): Promise<DuelRoomResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { bundle: null, error: 'Supabase not configured', source: 'none' };
  }

  // ── Path 1: nested select ─────────────────────────────────────────────
  const nested = await supabase
    .from('duel_rooms')
    .select(
      `*,
       participants:duel_participants(*, profile:profiles(*)),
       attempts:duel_attempts(*)`,
    )
    .eq('id', roomId)
    .maybeSingle();
  if (!nested.error && nested.data) {
    type Joined = DuelRoom & {
      participants: (DuelParticipant & { profile: Profile | null })[];
      attempts: DuelAttempt[];
    };
    const joined = nested.data as unknown as Joined;
    return {
      bundle: {
        room: {
          ...joined,
          participants: undefined as never,
          attempts: undefined as never,
        } as DuelRoom,
        participants: joined.participants ?? [],
        attempts: joined.attempts ?? [],
      },
      error: null,
      source: 'nested',
    };
  }
  if (__DEV__ && nested.error) {
    console.warn('[duelService.getDuelRoom] nested failed:', nested.error);
  }

  // ── Path 2: fall back to three discrete queries in parallel ──────────
  const [roomRes, partsRes, attemptsRes] = await Promise.all([
    supabase.from('duel_rooms').select('*').eq('id', roomId).maybeSingle(),
    supabase
      .from('duel_participants')
      .select('*')
      .eq('room_id', roomId),
    supabase.from('duel_attempts').select('*').eq('room_id', roomId),
  ]);

  if (roomRes.error || !roomRes.data) {
    const msg = nested.error?.message
      ?? roomRes.error?.message
      ?? 'Room not found';
    if (__DEV__) console.warn('[duelService.getDuelRoom] room fallback failed:', msg);
    return { bundle: null, error: msg, source: 'none' };
  }

  // Hydrate participant profiles separately (the embed inside the nested
  // failed; the FK join via duel_participants→profiles works on its own
  // table, but we already separated the parts call, so we fetch the
  // profiles by id here).
  const participantsRows = (partsRes.data ?? []) as DuelParticipant[];
  const profileIds = Array.from(new Set(participantsRows.map((p) => p.user_id)));
  let profilesById = new Map<string, Profile>();
  if (profileIds.length > 0) {
    const profilesRes = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds);
    if (!profilesRes.error && profilesRes.data) {
      for (const p of profilesRes.data as Profile[]) {
        profilesById.set(p.id, p);
      }
    }
  }

  const participants = participantsRows.map((p) => ({
    ...p,
    profile: profilesById.get(p.user_id) ?? null,
  }));

  return {
    bundle: {
      room: roomRes.data as DuelRoom,
      participants,
      attempts: (attemptsRes.data ?? []) as DuelAttempt[],
    },
    error: null,
    source: 'fallback',
  };
}

/** Back-compat shim: callers that only need the bundle (no diagnostics). */
export async function getDuelRoom(
  roomId: string,
): Promise<DuelRoomBundle | null> {
  const result = await getDuelRoomDetailed(roomId);
  return result.bundle;
}

export async function getRecentDuels(
  userId: string,
  limit = 5,
): Promise<DuelRoomBundle[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  // Join from participants -> rooms to find rooms the user is a member of.
  const { data, error } = await supabase
    .from('duel_participants')
    .select(
      `room:duel_rooms(*, participants:duel_participants(*, profile:profiles(*)), attempts:duel_attempts(*))`,
    )
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (__DEV__) console.warn('[duelService.getRecentDuels]', error.message);
    return [];
  }
  type Row = {
    room:
      | (DuelRoom & {
          participants: (DuelParticipant & { profile: Profile | null })[];
          attempts: DuelAttempt[];
        })
      | null;
  };
  const rows = data as unknown as Row[];
  return rows
    .map((r) => r.room)
    .filter((room): room is NonNullable<typeof room> => room != null)
    .map((room) => ({
      room: {
        ...room,
        participants: undefined as never,
        attempts: undefined as never,
      } as DuelRoom,
      participants: room.participants ?? [],
      attempts: room.attempts ?? [],
    }));
}

/** Identify the opponent participant for a room from the caller's POV. */
export function pickOpponent(
  participants: DuelRoomBundle['participants'],
  selfUserId: string,
): DuelRoomBundle['participants'][number] | null {
  return participants.find((p) => p.user_id !== selfUserId) ?? null;
}

/** Identify the caller's participant row. */
export function pickSelf(
  participants: DuelRoomBundle['participants'],
  selfUserId: string,
): DuelRoomBundle['participants'][number] | null {
  return participants.find((p) => p.user_id === selfUserId) ?? null;
}
