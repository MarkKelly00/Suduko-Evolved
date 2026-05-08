/**
 * Challenge create/accept/play/complete flow.
 *
 * Server enforces:
 *   * Only the challenger can INSERT into challenges.
 *   * Only participants can SELECT/UPDATE.
 *   * After the second attempt is inserted, the trigger
 *     `resolve_challenge_on_attempt` sets winner_id + status='completed'.
 */

import { getSupabase } from './supabaseClient';
import type {
  Challenge,
  ChallengeAttempt,
  ChallengeAttemptInsert,
} from './supabaseTypes';

export interface ChallengerAttempt {
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
  stars?: number | null;
  crown?: boolean | null;
  moveCount?: number | null;
}

export interface CreateChallengeInput {
  opponentId: string;
  mode: 'campaign' | 'sprint';
  levelId: string | null;
  sprintModeId?: string | null;
  puzzleSeed: string;
  challengerAttempt: ChallengerAttempt;
}

export async function createChallenge(
  input: CreateChallengeInput,
): Promise<Challenge | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (user.id === input.opponentId) throw new Error('Cannot challenge yourself');

  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({
      challenger_id: user.id,
      opponent_id: input.opponentId,
      mode: input.mode,
      level_id: input.levelId,
      sprint_mode_id: input.sprintModeId ?? null,
      puzzle_seed: input.puzzleSeed,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  // Insert challenger's attempt as the seed score.
  const attempt: ChallengeAttemptInsert = {
    challenge_id: (challenge as Challenge).id,
    user_id: user.id,
    score: input.challengerAttempt.score,
    time_ms: Math.round(input.challengerAttempt.timeSeconds * 1000),
    mistakes: input.challengerAttempt.mistakes,
    hints: input.challengerAttempt.hints,
    stars: input.challengerAttempt.stars ?? null,
    crown: input.challengerAttempt.crown ?? null,
    move_count: input.challengerAttempt.moveCount ?? null,
  };
  const { error: attemptError } = await supabase.from('challenge_attempts').insert(attempt);
  if (attemptError) {
    if (__DEV__) console.warn('[challengeService.createChallenge:attempt]', attemptError.message);
  }
  return challenge as Challenge;
}

export async function markAcceptedOnPlayStart(challengeId: string): Promise<void> {
  // The trigger will mark accepted on the opponent's first attempt INSERT.
  // We update it eagerly here so the inbox UI updates the moment they tap Play.
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from('challenges')
    .update({ status: 'accepted' })
    .eq('id', challengeId)
    .eq('status', 'pending');
}

export async function declineChallenge(challengeId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('challenges')
    .update({ status: 'declined' })
    .eq('id', challengeId);
  if (error) throw error;
}

export interface OpponentAttemptInput {
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
  stars?: number | null;
  crown?: boolean | null;
  moveCount?: number | null;
}

export async function submitOpponentAttempt(
  challengeId: string,
  input: OpponentAttemptInput,
): Promise<ChallengeAttempt | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('challenge_attempts')
    .insert({
      challenge_id: challengeId,
      user_id: user.id,
      score: input.score,
      time_ms: Math.round(input.timeSeconds * 1000),
      mistakes: input.mistakes,
      hints: input.hints,
      stars: input.stars ?? null,
      crown: input.crown ?? null,
      move_count: input.moveCount ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ChallengeAttempt;
}

export async function getInbox(): Promise<Challenge[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .in('status', ['pending', 'accepted'])
    .eq('opponent_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[challengeService.getInbox]', error.message);
    return [];
  }
  return (data ?? []) as Challenge[];
}

export async function getOutgoing(): Promise<Challenge[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .in('status', ['pending', 'accepted'])
    .eq('challenger_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[challengeService.getOutgoing]', error.message);
    return [];
  }
  return (data ?? []) as Challenge[];
}

export async function getCompleted(limit = 5): Promise<Challenge[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'completed')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (__DEV__) console.warn('[challengeService.getCompleted]', error.message);
    return [];
  }
  return (data ?? []) as Challenge[];
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[challengeService.getChallenge]', error.message);
    return null;
  }
  return data as Challenge | null;
}

export async function getChallengeAttempts(challengeId: string): Promise<ChallengeAttempt[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('challenge_attempts')
    .select('*')
    .eq('challenge_id', challengeId);
  if (error) {
    if (__DEV__) console.warn('[challengeService.getChallengeAttempts]', error.message);
    return [];
  }
  return (data ?? []) as ChallengeAttempt[];
}

/** Reverses challenger/opponent and reuses the puzzle seed. */
export async function createRematch(challengeId: string): Promise<Challenge | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const original = await getChallenge(challengeId);
  if (!original) throw new Error('Challenge not found');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const newChallenger = user.id;
  const newOpponent =
    original.challenger_id === user.id ? original.opponent_id : original.challenger_id;

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      challenger_id: newChallenger,
      opponent_id: newOpponent,
      mode: original.mode,
      level_id: original.level_id,
      sprint_mode_id: original.sprint_mode_id,
      puzzle_seed: original.puzzle_seed,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Challenge;
}
