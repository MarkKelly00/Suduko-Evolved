/**
 * Public Game Center barrel. Mirrors the `friendService` /
 * `duelService` style — callers do:
 *
 *   import { gameCenterService } from '@/services/gameCenter';
 *   import {
 *     GAME_CENTER_LEADERBOARDS,
 *     GAME_CENTER_ACHIEVEMENTS,
 *   } from '@/services/gameCenter';
 *
 * Service methods are exposed under the `gameCenterService` namespace
 * so call sites read fluently:
 *
 *   await gameCenterService.submitScore({ leaderboardId: ..., value: 5 });
 */

export * as gameCenterService from './gameCenterService';

export {
  ACHIEVEMENT_POINTS,
  ALL_ACHIEVEMENT_IDS,
  ALL_LEADERBOARD_IDS,
  GAME_CENTER_ACHIEVEMENTS,
  GAME_CENTER_LEADERBOARDS,
  type GameCenterAchievementId,
  type GameCenterLeaderboardId,
} from './gameCenterIds';

export {
  buildCampaignTotalsSubmissions,
  buildDuelSubmissions,
  buildSprintSubmissions,
  isKnownLeaderboardId,
  type CampaignTotalsInput,
  type DuelResultInput,
  type SprintResultInput,
} from './gameCenterMappers';

export {
  isAvailableSync,
  isNativeModuleLoaded,
  isPlatformIOS,
} from './gameCenterAvailability';

export type {
  AchievementSubmission,
  AuthenticateOutcome,
  GameCenterPlayer,
  InitializeResult,
  LeaderboardSubmission,
  QueueEntry,
  ShowResult,
  SubmissionOutcome,
} from './gameCenterTypes';
