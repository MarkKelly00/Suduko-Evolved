/**
 * Client-side mirror of the Postgres `compute_challenge_winner` function.
 * Tie-break order: score desc → time asc → mistakes asc → hints asc → draw.
 *
 * Both run on every challenge completion: the client does it for snappy
 * UX, the server does it as the authoritative result. They will agree
 * because the inputs are immutable.
 */

export interface AttemptRecord {
  score: number;
  timeSeconds: number;
  mistakes: number;
  hints: number;
}

export function computeChallengeWinner(
  a: AttemptRecord,
  b: AttemptRecord,
  aId: string,
  bId: string,
): string | null {
  if (a.score !== b.score) return a.score > b.score ? aId : bId;
  if (a.timeSeconds !== b.timeSeconds)
    return a.timeSeconds < b.timeSeconds ? aId : bId;
  if (a.mistakes !== b.mistakes) return a.mistakes < b.mistakes ? aId : bId;
  if (a.hints !== b.hints) return a.hints < b.hints ? aId : bId;
  return null;
}
