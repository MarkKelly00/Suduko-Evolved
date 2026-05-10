/**
 * `expo-game-center` — public JS entry point for the native iOS Game
 * Center bridge. Importers should generally NOT use this module directly;
 * `src/services/gameCenter/gameCenterService.ts` wraps it with the cross-
 * platform contract (Android no-op, retry queue, opt-in gating, etc.).
 *
 * Direct import is fine for tooling that needs the native types or for
 * the service-layer's own internal use.
 */

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { SudokuGameCenterNativeModule } from './types';

/**
 * Loaded lazily so that simply importing this module never crashes when
 * the native side is missing (Android, web, simulator builds without the
 * pod, etc.). Mirrors the lazy-load pattern used by
 * `authService.loadAppleAuth()`.
 */
let cached: SudokuGameCenterNativeModule | null | undefined;

export function getNativeGameCenter(): SudokuGameCenterNativeModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'ios') {
    cached = null;
    return cached;
  }
  try {
    cached = requireNativeModule<SudokuGameCenterNativeModule>(
      'SudokuGameCenter',
    );
  } catch {
    cached = null;
  }
  return cached;
}

export type {
  AuthenticateResult,
  NativeLocalPlayer,
  ReportAchievementResult,
  ResetAchievementsResult,
  ShowUIResult,
  SubmitScoreResult,
  SudokuGameCenterNativeModule,
} from './types';
