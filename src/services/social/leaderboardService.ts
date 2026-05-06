/**
 * Leaderboard service stub. Future-ready for server-validated scores —
 * `submitLocalScore` carries the puzzle seed + level + move count so the
 * backend can re-simulate to detect cheating once it exists.
 */

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

export const leaderboardService = {
  async submitLocalScore(_submission: LeaderboardSubmission): Promise<void> {
    // No-op until backend exists. We could mirror to MMKV in Phase 6 for
    // an offline ledger.
  },
  async getFriendScores(_leaderboardId: string): Promise<LeaderboardEntry[]> {
    // Mock so UI placeholders show realistic content. Replace with a fetch
    // call in Phase 6+.
    return MOCK_FRIENDS;
  },
};
