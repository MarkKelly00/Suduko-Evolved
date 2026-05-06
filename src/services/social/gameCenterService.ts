/**
 * Game Center stub. Phase 3 ships no native module — every method resolves
 * with a default so UI placeholders can render without conditional spaghetti.
 *
 * Phase 6+ will replace these stubs with calls into a native iOS module
 * (Swift) that wraps GameKit. The signatures are designed to stay stable
 * across that swap.
 */

export interface GameCenterPlayer {
  id: string;
  alias: string;
  displayName: string;
}

export const gameCenterService = {
  async authenticate(): Promise<GameCenterPlayer | null> {
    return null;
  },
  isAuthenticated(): boolean {
    return false;
  },
  async submitScore(_leaderboardId: string, _score: number): Promise<void> {
    // No-op until native module is wired.
  },
  async showLeaderboard(_leaderboardId?: string): Promise<void> {
    // No-op.
  },
  async reportAchievement(
    _achievementId: string,
    _percentComplete: number,
  ): Promise<void> {
    // No-op.
  },
};
