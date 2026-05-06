/**
 * Daily puzzle stub. Phase 6 will pick a seeded difficulty per day and wire
 * a leaderboard submission. For now we expose the seed function so screens
 * can render a placeholder with the correct date label.
 */
import { dailySeed } from './timeTrial';

export const dailyPuzzle = {
  seedForToday: dailySeed,
};
