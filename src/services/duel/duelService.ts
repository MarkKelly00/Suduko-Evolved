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

export async function getDuelRoom(
  roomId: string,
): Promise<DuelRoomBundle | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('duel_rooms')
    .select(
      `*,
       participants:duel_participants(*, profile:profiles(*)),
       attempts:duel_attempts(*)`,
    )
    .eq('id', roomId)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[duelService.getDuelRoom]', error.message);
    return null;
  }
  if (!data) return null;
  type Joined = DuelRoom & {
    participants: (DuelParticipant & { profile: Profile | null })[];
    attempts: DuelAttempt[];
  };
  const joined = data as unknown as Joined;
  return {
    room: {
      ...joined,
      participants: undefined as never,
      attempts: undefined as never,
    } as DuelRoom,
    participants: joined.participants ?? [],
    attempts: joined.attempts ?? [],
  };
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
