/**
 * Public surface of the Supabase service layer. Components import from
 * `@/services/supabase` so we can refactor internal layout without churning
 * call sites.
 */

export { getSupabase } from './supabaseClient';
export { isSupabaseConfigured } from './env';

export * as authService from './authService';
export * as profileService from './profileService';
export * as friendService from './friendService';
export * as challengeService from './challengeService';
export * as leaderboardService from './leaderboardService';
export * as avatarService from './avatarService';
export * as scoreSubmissionService from './scoreSubmissionService';

export {
  normalizeUsername,
  validateUsername,
  describeUsernameError,
} from './utils/username';

export type {
  Profile,
  Friendship,
  LevelScore,
  TimeTrialScore,
  Challenge,
  ChallengeAttempt,
  LeaderboardRow,
  TimeTrialLeaderboardRow,
  Database,
} from './supabaseTypes';
