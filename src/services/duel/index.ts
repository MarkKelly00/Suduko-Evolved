/**
 * Public entry point for the duel service layer.
 *
 *   import { matchmakingService, duelService } from '@/services/duel';
 *
 * Each sub-module is exposed as a namespace so call-sites read clearly
 * (`matchmakingService.joinMatchmaking(...)`) without polluting one
 * giant module surface.
 */
export * as matchmakingService from './matchmakingService';
export * as duelService from './duelService';
export * as duelRealtimeService from './duelRealtimeService';
export * as duelInviteService from './duelInviteService';
export * as duelSubmissionService from './duelSubmissionService';

export * from './types';
