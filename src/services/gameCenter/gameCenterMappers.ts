/**
 * Score / time / count mappers — convert in-app values into the integer
 * units that App Store Connect expects per leaderboard.
 *
 * App Store Connect leaderboards have a fixed format chosen at creation
 * time. The relevant ones for Sudoku Evolved:
 *
 *   SPRINT_3MIN_SCORE       — Integer (raw)
 *   SPRINT_FASTEST_CLEAR    — "Elapsed Time - To Hundredths" — value is
 *                             milliseconds (Apple displays as MM:SS.cc)
 *   DUEL_WINS               — Integer (cumulative count)
 *   DUEL_BEST_SCORE         — Integer (raw)
 *   LOGIC_GARDEN_STARS      — Integer (sum of all level stars, max 90)
 *   LOGIC_GARDEN_CROWNS     — Integer (count of crowned levels, max 30)
 *
 * Centralising the unit math here means we only need to revisit one
 * file if Apple changes a leaderboard's format or the in-app score /
 * time representation shifts.
 */

import {
  GAME_CENTER_LEADERBOARDS,
  type GameCenterLeaderboardId,
} from './gameCenterIds';
import type { LeaderboardSubmission } from './gameCenterTypes';

/** Convert seconds (the app's native time unit) into the milliseconds
 *  expected by SPRINT_FASTEST_CLEAR. Rounds to nearest int. */
export function secondsToCentiseconds(seconds: number): number {
  return Math.max(0, Math.round(seconds * 1000));
}

/** Coerce any unknown numeric to a safe non-negative integer. */
export function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

// ─── Per-flow builders ─────────────────────────────────────────────────────

export interface CampaignTotalsInput {
  /** Sum of all level stars across World 1 (cap: 90). */
  totalStars: number;
  /** Count of crowned levels across World 1 (cap: 30). */
  totalCrowns: number;
}

export function buildCampaignTotalsSubmissions(
  input: CampaignTotalsInput,
): LeaderboardSubmission[] {
  return [
    {
      leaderboardId: GAME_CENTER_LEADERBOARDS.LOGIC_GARDEN_STARS,
      value: clampNonNegativeInt(input.totalStars),
    },
    {
      leaderboardId: GAME_CENTER_LEADERBOARDS.LOGIC_GARDEN_CROWNS,
      value: clampNonNegativeInt(input.totalCrowns),
    },
  ];
}

export interface SprintResultInput {
  score: number;
  /** Elapsed time in seconds. Submitted only when `cleared` is true. */
  timeSeconds: number;
  /** Did the player actually finish the puzzle? Time-based leaderboards
   *  receive submissions only on a clean clear (otherwise the board
   *  fills with 3-minute timer floors). */
  cleared: boolean;
}

export function buildSprintSubmissions(
  input: SprintResultInput,
): LeaderboardSubmission[] {
  const out: LeaderboardSubmission[] = [
    {
      leaderboardId: GAME_CENTER_LEADERBOARDS.SPRINT_3MIN_SCORE,
      value: clampNonNegativeInt(input.score),
    },
  ];
  if (input.cleared) {
    out.push({
      leaderboardId: GAME_CENTER_LEADERBOARDS.SPRINT_FASTEST_CLEAR,
      value: secondsToCentiseconds(input.timeSeconds),
    });
  }
  return out;
}

export interface DuelResultInput {
  /** Final score the local player put up in the duel. */
  score: number;
  /** Whether the local player won. Loser submissions skip DUEL_WINS so
   *  losing a duel doesn't bump the cumulative wins counter. */
  won: boolean;
  /** Cumulative wins count to set on DUEL_WINS. The leaderboard sort is
   *  high → low, so we always submit the new total — Apple keeps the
   *  highest-ever value the player has submitted. */
  cumulativeWins: number;
}

export function buildDuelSubmissions(
  input: DuelResultInput,
): LeaderboardSubmission[] {
  const out: LeaderboardSubmission[] = [
    {
      leaderboardId: GAME_CENTER_LEADERBOARDS.DUEL_BEST_SCORE,
      value: clampNonNegativeInt(input.score),
    },
  ];
  if (input.won) {
    out.push({
      leaderboardId: GAME_CENTER_LEADERBOARDS.DUEL_WINS,
      value: clampNonNegativeInt(input.cumulativeWins),
    });
  }
  return out;
}

/** Type-guard: validate a leaderboard ID at runtime. */
export function isKnownLeaderboardId(
  id: string,
): id is GameCenterLeaderboardId {
  const known: readonly string[] = Object.values(GAME_CENTER_LEADERBOARDS);
  return known.includes(id);
}
