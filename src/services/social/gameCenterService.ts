/**
 * Game Center service. iOS-only, optional. Looks for a Swift native module
 * at runtime (`NativeModules.SudokuGameCenter`). When the module is
 * present, calls route through it. When it's absent — which is the case
 * for the current MVP build, and always for Android/web/Jest — every
 * method resolves with a safe default so callers never branch on
 * platform-specific availability.
 *
 * The intended Phase 6+ implementation is a tiny GameKit wrapper compiled
 * via an Expo config plugin; see `docs/native/game-center.md` (next-steps
 * section of the README) for the recipe. The runtime contract documented
 * by this file is what that plugin must export from ObjC/Swift.
 */
import { NativeModules, Platform } from 'react-native';

export interface GameCenterPlayer {
  id: string;
  alias: string;
  displayName: string;
}

interface NativeGameCenterModule {
  authenticate: () => Promise<GameCenterPlayer | null>;
  isAuthenticated: () => boolean;
  submitScore: (leaderboardId: string, score: number) => Promise<void>;
  showLeaderboard: (leaderboardId?: string) => Promise<void>;
  reportAchievement: (achievementId: string, percentComplete: number) => Promise<void>;
}

/** Resolve the native module if present. Returns `null` when:
 *   • running on a non-iOS platform,
 *   • the bundle was built without the native module,
 *   • running in Jest (no `NativeModules` object).
 *
 * Cached after first call so we don't re-look-up on every action. */
let cached: NativeGameCenterModule | null | undefined = undefined;
function getNative(): NativeGameCenterModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'ios') {
    cached = null;
    return null;
  }
  const candidate = (NativeModules as Record<string, unknown>).SudokuGameCenter;
  if (
    candidate != null &&
    typeof (candidate as NativeGameCenterModule).authenticate === 'function'
  ) {
    cached = candidate as NativeGameCenterModule;
  } else {
    cached = null;
  }
  return cached;
}

let cachedPlayer: GameCenterPlayer | null = null;
let authenticated = false;

export const gameCenterService = {
  /** Triggers Game Center sign-in. The native module presents Apple's
   *  default sheet on first call and resolves with the player when done.
   *  Without the native module, resolves with `null` (caller should treat
   *  it as "not signed in" and fall back to local-only flows). */
  async authenticate(): Promise<GameCenterPlayer | null> {
    const native = getNative();
    if (!native) return null;
    try {
      const player = await native.authenticate();
      cachedPlayer = player;
      authenticated = !!player;
      return player;
    } catch {
      return null;
    }
  },
  /** Synchronous "are we signed in?" check, used by Profile / Results UI to
   *  decide whether to show "Connect Game Center" CTAs. The cached flag
   *  avoids native bridge round-trips on every render. */
  isAuthenticated(): boolean {
    const native = getNative();
    if (!native) return false;
    try {
      return native.isAuthenticated() && authenticated;
    } catch {
      return false;
    }
  },
  /** Cached snapshot of the most recently authenticated player; `null`
   *  before the first successful `authenticate()`. */
  currentPlayer(): GameCenterPlayer | null {
    return cachedPlayer;
  },
  async submitScore(leaderboardId: string, score: number): Promise<void> {
    const native = getNative();
    if (!native) return;
    try {
      await native.submitScore(leaderboardId, score);
    } catch {
      /* swallow — leaderboard submission is best-effort */
    }
  },
  async showLeaderboard(leaderboardId?: string): Promise<void> {
    const native = getNative();
    if (!native) return;
    try {
      await native.showLeaderboard(leaderboardId);
    } catch {
      /* swallow */
    }
  },
  async reportAchievement(
    achievementId: string,
    percentComplete: number,
  ): Promise<void> {
    const native = getNative();
    if (!native) return;
    try {
      await native.reportAchievement(achievementId, percentComplete);
    } catch {
      /* swallow */
    }
  },
};
