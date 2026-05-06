/**
 * Friend challenge service stub. The shape captures what a real
 * implementation will need: a deterministic puzzle reference (seed +
 * difficulty + level) and a sender, so a friend can play the *same* puzzle
 * and have a fair head-to-head comparison.
 */

export interface FriendChallenge {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  /** Puzzle is fully reproducible from these. */
  levelId: string;
  seed: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard';
  /** Sender's score the receiver is challenged to beat. */
  challengerScore: number;
  challengerTime: number;
  createdAt: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
}

export const friendChallengeService = {
  async createChallenge(_input: Omit<FriendChallenge, 'id' | 'createdAt' | 'status'>): Promise<FriendChallenge> {
    return {
      ..._input,
      id: `challenge-${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
    };
  },
  async acceptChallenge(_challengeId: string): Promise<void> {
    // No-op until backend exists.
  },
  async declineChallenge(_challengeId: string): Promise<void> {
    // No-op.
  },
  async getPendingChallenges(): Promise<FriendChallenge[]> {
    return [];
  },
};
