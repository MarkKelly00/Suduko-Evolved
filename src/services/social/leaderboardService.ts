/**
 * Leaderboard service. Captures every sprint / level run with enough
 * metadata for future server-side validation (puzzle seed + level + move
 * count → fully re-simulatable), and forwards the score to Game Center if
 * the player is authenticated. Mock friend scores keep the UI populated
 * until a real backend lands.
 */

import { gameCenterService } from './gameCenterService';

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  /** Time in seconds. */
  time: number;
  date: number;
  /** Where in the friends ladder this entry sits. */
  rank: number;
  isFriend: boolean;
}

export interface LeaderboardSubmission {
  leaderboardId: string;
  levelId: string;
  seed: string;
  score: number;
  time: number;
  mistakes: number;
  hintsUsed: number;
  moveCount: number;
  timestamp: number;
}

const MOCK_FRIENDS: LeaderboardEntry[] = [
  { playerId: 'mock-1', playerName: 'Asha', score: 4200, time: 184, date: Date.now(), rank: 1, isFriend: true },
  { playerId: 'mock-2', playerName: 'Theo', score: 3800, time: 211, date: Date.now(), rank: 2, isFriend: true },
  { playerId: 'mock-3', playerName: 'Maya', score: 3500, time: 247, date: Date.now(), rank: 3, isFriend: true },
];

/** In-memory ledger of the most recent N submissions. Survives the session
 *  but not app restarts (use MMKV later if we want true offline history).
 *  Visible so the UI can show "your last runs" without a network. */
const RECENT_LIMIT = 20;
const recent: LeaderboardSubmission[] = [];

export const leaderboardService = {
  /** Record a local score and best-effort forward it to Game Center. The
   *  forward only happens if `gameCenterService.isAuthenticated()` is
   *  true — the player has to actively connect their account first. */
  async submitLocalScore(submission: LeaderboardSubmission): Promise<void> {
    recent.unshift(submission);
    if (recent.length > RECENT_LIMIT) recent.length = RECENT_LIMIT;
    if (gameCenterService.isAuthenticated()) {
      await gameCenterService.submitScore(submission.leaderboardId, submission.score);
    }
  },
  /** Snapshot of the in-memory submissions ledger. Newest first. */
  getRecentSubmissions(): readonly LeaderboardSubmission[] {
    return recent;
  },
  async getFriendScores(_leaderboardId: string): Promise<LeaderboardEntry[]> {
    // Mock so UI placeholders show realistic content. Replace with a fetch
    // call in Phase 6+.
    return MOCK_FRIENDS;
  },
};
