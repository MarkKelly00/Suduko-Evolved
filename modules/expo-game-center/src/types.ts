/**
 * Native bridge types — the thin shape the Swift module returns over the
 * JSI. Higher-level domain types (the things the rest of the app deals
 * with) live in `src/services/gameCenter/gameCenterTypes.ts`.
 *
 * Every native call must always resolve, never reject, so the JS service
 * layer can short-circuit on `ok: false` without try/catch noise. Errors
 * surface as fields on the resolved object, not as thrown exceptions.
 */

export interface AuthenticateResult {
  /** GKLocalPlayer.local.isAuthenticated after the handler runs. */
  authenticated: boolean;
  /** GameKit framework + device support. False on Phase 1 stub. */
  available: boolean;
  /** True when GameKit asked us to present a sign-in sheet but the
   *  caller passed `presentSignIn: false` to avoid intruding. The
   *  Settings opt-in flow re-calls with `presentSignIn: true`. */
  requiresSignIn?: boolean;
  /** Optional human-readable error tag (developer-only logging). */
  error?: string;
  /** Phase marker — 1 in Phase 1 stub, removed once GameKit is wired. */
  phase?: number;
}

export interface NativeLocalPlayer {
  /** Public-facing display name. May be the alias or full name based on
   *  the player's Game Center privacy settings. */
  displayName: string | null;
  /** Apple's per-app stable player identifier — safe to compare across
   *  launches but never store in any user-discoverable surface. */
  gamePlayerID: string | null;
  /** Apple's per-game-team stable identifier (null when teams disabled). */
  teamPlayerID: string | null;
  alias: string | null;
}

export interface SubmitScoreResult {
  ok: boolean;
  /** True only after GameKit acknowledges the submission. Phase 1 returns
   *  false here even when ok=true so the JS queue can distinguish
   *  "queued for later" from "actually delivered to Apple". */
  submitted: boolean;
  leaderboardID: string;
  value: number;
  error?: string;
  phase?: number;
}

export interface ReportAchievementResult {
  ok: boolean;
  submitted: boolean;
  achievementID: string;
  percentComplete: number;
  error?: string;
  phase?: number;
}

export interface ShowUIResult {
  presented: boolean;
  error?: string;
  phase?: number;
}

export interface ResetAchievementsResult {
  ok: boolean;
  error?: string;
  phase?: number;
}

/**
 * The native module's TypeScript surface — exactly what
 * `requireNativeModule('SudokuGameCenter')` returns. Functions are async
 * because every call hops the JS thread to the iOS main thread.
 */
export interface SudokuGameCenterNativeModule {
  isAvailable(): Promise<boolean>;
  isAuthenticated(): Promise<boolean>;
  authenticate(presentSignIn: boolean): Promise<AuthenticateResult>;
  getLocalPlayer(): Promise<NativeLocalPlayer | null>;
  submitScore(
    leaderboardID: string,
    value: number,
  ): Promise<SubmitScoreResult>;
  reportAchievement(
    achievementID: string,
    percentComplete: number,
  ): Promise<ReportAchievementResult>;
  showLeaderboard(leaderboardID: string | null): Promise<ShowUIResult>;
  showAchievements(): Promise<ShowUIResult>;
  showDashboard(): Promise<ShowUIResult>;
  resetAchievementsDevOnly(): Promise<ResetAchievementsResult>;
}
