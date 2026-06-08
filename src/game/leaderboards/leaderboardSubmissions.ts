/**
 * High-level Game Center submission orchestrator.
 *
 * Each `submit*Result()` function takes the post-completion game state
 * and fires both the leaderboard score submissions and achievement
 * progress reports for that flow. Call sites — ResultsScreen,
 * DuelResultsScreen, FriendDuelPickerScreen — pass in the things they
 * already have on hand (the result params from navigation, plus a
 * snapshot of the progress store), and don't need to know which
 * leaderboard / achievement maps to which event.
 *
 * Threading rules:
 *   - Functions return Promise<void> but callers should generally
 *     fire-and-forget (`void submitCampaignResult(...)`). The return
 *     value exists for tests + the optional "synced" toast in the UI.
 *   - The functions themselves run leaderboard + achievement
 *     submissions in parallel via Promise.all so a slow Game Center
 *     ack on one doesn't delay the other.
 *
 * No screen ever reaches into `gameCenterService.submitScore()` or
 * `reportAchievement()` directly. This file is the only place where
 * gameplay maps to Game Center semantics — keeps the per-flow logic
 * in one place and out of the JSX.
 */

import { getStorage } from '@/services/persistence/storage';
import {
  buildCampaignTotalsSubmissions,
  buildWorld2TotalsSubmissions,
  buildDuelSubmissions,
  buildSprintSubmissions,
  gameCenterService,
  type CampaignTotalsInput,
  type World2TotalsInput,
  type DuelResultInput,
  type SprintResultInput,
  type SubmissionOutcome,
} from '@/services/gameCenter';
import {
  evaluate,
  evaluateAll,
  type AchievementEvent,
} from '@/game/achievements/achievementRules';
import { reportAchievementsWithProgress } from '@/game/achievements/achievementProgress';

// ─── Progress-store snapshot helpers ───────────────────────────────────────
//
// The Game Center submissions need totals + per-act cleared counts.
// These helpers project a `useProgressStore` snapshot down to the
// shapes `submitCampaignResult` consumes. They live here (rather than
// in the progress store) because the projection is Game-Center-flavoured
// — the act buckets are only meaningful for the Logic Garden / World 1
// achievements and don't generalize to other parts of the app.

const LEVEL_ID_REGEX = /^world1-level-(\d+)$/;

/** Internal: parse `world1-level-N` → N. Returns null on mismatch. */
function levelIndexFromId(levelId: string): number | null {
  const match = LEVEL_ID_REGEX.exec(levelId);
  if (!match) return null;
  const n = parseInt(match[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

interface CampaignTotalsSnapshot {
  totalStars: number;
  totalCrowns: number;
  perActCleared: {
    seedGrove: number;
    moonvineStream: number;
    oracleBloom: number;
  };
}

/** Compute `{ totalStars, totalCrowns, perActCleared }` from a
 *  progress-store `levels` map. Skips any IDs outside the World 1
 *  pattern (future worlds will need their own derivation). */
export function deriveCampaignTotals(
  levels: Record<string, { stars: 1 | 2 | 3; crown: boolean }>,
): CampaignTotalsSnapshot {
  let totalStars = 0;
  let totalCrowns = 0;
  let seedGrove = 0;
  let moonvineStream = 0;
  let oracleBloom = 0;

  for (const [id, entry] of Object.entries(levels)) {
    const level = levelIndexFromId(id);
    if (level == null || level < 1 || level > 30) continue;
    totalStars += entry.stars;
    if (entry.crown) totalCrowns += 1;
    if (level <= 10) seedGrove += 1;
    else if (level <= 20) moonvineStream += 1;
    else oracleBloom += 1;
  }

  return {
    totalStars,
    totalCrowns,
    perActCleared: { seedGrove, moonvineStream, oracleBloom },
  };
}

// ─── World 2 (Astral Nexus) totals ───────────────────────────────────────────

const WORLD2_LEVEL_ID_REGEX = /^world2-level-(\d+)$/;

export interface World2TotalsSnapshot {
  totalStars: number;
  totalCrowns: number;
  /** 0..30 World 2 levels cleared. */
  clearedCount: number;
}

/** Compute World 2 stars/crowns/clearedCount from a progress-store `levels`
 *  map. Mirrors `deriveCampaignTotals` but for the `world2-level-N` (31–60)
 *  pattern — kept separate because the Astral Nexus leaderboards/achievements
 *  must not mix with World 1's. */
export function deriveWorld2Totals(
  levels: Record<string, { stars: 1 | 2 | 3; crown: boolean }>,
): World2TotalsSnapshot {
  let totalStars = 0;
  let totalCrowns = 0;
  let clearedCount = 0;
  for (const [id, entry] of Object.entries(levels)) {
    const m = WORLD2_LEVEL_ID_REGEX.exec(id);
    if (!m) continue;
    const level = parseInt(m[1]!, 10);
    if (!Number.isFinite(level) || level < 31 || level > 60) continue;
    totalStars += entry.stars;
    clearedCount += 1;
    if (entry.crown) totalCrowns += 1;
  }
  return { totalStars, totalCrowns, clearedCount };
}

// ─── Campaign ──────────────────────────────────────────────────────────────

export interface CampaignFlowInput extends CampaignTotalsInput {
  /** 1–30. Drives the campaignLevelCompleted event. */
  level: number;
  /** Did the player earn a crown on this run? */
  isCrown: boolean;
  /** Hints used during the run; 0 unlocks NO_HINTS_NEEDED. */
  hintsUsed: number;
  /** Per-act cleared counts (post-completion). */
  perActCleared: {
    seedGrove: number;
    moonvineStream: number;
    oracleBloom: number;
  };
  /** Optional: number of regions (rows/cols/boxes) completed by the
   *  final placement; >= 3 unlocks PERFECT_HARMONY. */
  multiRegionCount?: number;
  /** Optional: did the player pause and resume during the run? */
  pausedDuringRun?: boolean;
}

export interface SubmitFlowResult {
  scores: SubmissionOutcome[];
  achievements: SubmissionOutcome[];
}

export async function submitCampaignResult(
  input: CampaignFlowInput,
): Promise<SubmitFlowResult> {
  const events: AchievementEvent[] = [
    { kind: 'campaignLevelCompleted', level: input.level },
    { kind: 'starsUpdated', totalStars: input.totalStars },
    { kind: 'crownsUpdated', totalCrowns: input.totalCrowns },
    {
      kind: 'worldProgressUpdated',
      seedGroveCleared: input.perActCleared.seedGrove,
      moonvineStreamCleared: input.perActCleared.moonvineStream,
      oracleBloomCleared: input.perActCleared.oracleBloom,
    },
  ];
  if (input.isCrown) events.push({ kind: 'crownEarned' });
  if (input.hintsUsed === 0) events.push({ kind: 'noHintClear' });
  if (input.multiRegionCount && input.multiRegionCount >= 3) {
    events.push({
      kind: 'multiRegionCompletion',
      regionCount: input.multiRegionCount,
    });
  }
  if (input.pausedDuringRun) events.push({ kind: 'pausedAndCompleted' });

  const [scores, achievements] = await Promise.all([
    gameCenterService.submitScores(buildCampaignTotalsSubmissions(input)),
    reportAchievementsWithProgress(evaluateAll(events)),
  ]);
  return { scores, achievements };
}

// ─── World 2 / Astral Nexus ──────────────────────────────────────────────────

export interface World2FlowInput extends World2TotalsInput {
  /** 31–60. The completed Astral Nexus level. */
  level: number;
  /** Did the player earn a crown on this run? */
  isCrown: boolean;
  /** Hints used during the run; 0 unlocks NO_HINTS_NEEDED (cross-world). */
  hintsUsed: number;
  /** 0..30 World 2 levels cleared (post-completion). */
  clearedCount: number;
  /** Optional: regions completed by the final placement; >= 3 → PERFECT_HARMONY. */
  multiRegionCount?: number;
  /** Optional: did the player pause and resume during the run? */
  pausedDuringRun?: boolean;
}

/**
 * Game Center submission for an Astral Nexus level completion. Distinct from
 * `submitCampaignResult`:
 *   • Drives the Astral Nexus stars/crowns leaderboards (not Logic Garden's).
 *   • Fires ASTRAL_NEXUS_UNLOCKED / ASTRAL_NEXUS_COMPLETE / ASTRAL_CORE_PERFECT.
 *   • Still fires the world-agnostic SKILL achievements (crown, no-hint,
 *     multi-region, pause-and-resume) so they accrue in either world.
 * The Astral Nexus leaderboard/achievement ids stay inert until the operator
 * registers them in App Store Connect (the service skips unregistered ids).
 */
export async function submitWorld2Result(
  input: World2FlowInput,
): Promise<SubmitFlowResult> {
  const events: AchievementEvent[] = [
    { kind: 'world2ProgressUpdated', unlocked: true, clearedCount: input.clearedCount },
  ];
  if (input.level === 60 && input.isCrown) {
    events.push({ kind: 'astralCorePerfect' });
  }
  // Cross-world skill achievements still count in World 2.
  if (input.isCrown) events.push({ kind: 'crownEarned' });
  if (input.hintsUsed === 0) events.push({ kind: 'noHintClear' });
  if (input.multiRegionCount && input.multiRegionCount >= 3) {
    events.push({ kind: 'multiRegionCompletion', regionCount: input.multiRegionCount });
  }
  if (input.pausedDuringRun) events.push({ kind: 'pausedAndCompleted' });

  const [scores, achievements] = await Promise.all([
    gameCenterService.submitScores(buildWorld2TotalsSubmissions(input)),
    reportAchievementsWithProgress(evaluateAll(events)),
  ]);
  return { scores, achievements };
}

// ─── Sprint ────────────────────────────────────────────────────────────────

export interface SprintFlowInput extends SprintResultInput {
  /** Mistakes during the run. 0 + 0 hints + cleared = perfect. */
  mistakes: number;
  /** Hints used during the run. */
  hintsUsed: number;
}

export async function submitSprintResult(
  input: SprintFlowInput,
): Promise<SubmitFlowResult> {
  const events: AchievementEvent[] = [
    { kind: 'sprintCompleted', cleared: input.cleared },
  ];
  if (input.cleared && input.mistakes === 0 && input.hintsUsed === 0) {
    events.push({ kind: 'sprintPerfectCompleted' });
  }
  const [scores, achievements] = await Promise.all([
    gameCenterService.submitScores(buildSprintSubmissions(input)),
    reportAchievementsWithProgress(evaluateAll(events)),
  ]);
  return { scores, achievements };
}

// ─── Duel wins counter ─────────────────────────────────────────────────────
//
// Game Center's DUEL_WINS leaderboard wants a cumulative count. We
// don't have an authoritative server count to read from, so we keep
// a local counter keyed by roomId so duplicate realtime callbacks
// don't double-bump it. Apple's leaderboard takes the max-ever value
// submitted, which gracefully handles edge cases:
//   - reinstall → counter resets to 0, Apple keeps the higher prior
//   - multi-device → each device tracks its own; Apple shows the max
//
// The dedupe-by-roomId behaviour is the important part — it keeps the
// counter monotonic per device.

const DUEL_WINS_COUNT_KEY = 'gameCenter.duelWinsCount';
const DUEL_WINS_ROOMS_KEY = 'gameCenter.duelWinRoomIds';

/** Idempotent: bumps the local duel-wins count if `roomId` hasn't
 *  been counted yet, returning the count after the bump. If it has
 *  been counted, returns the existing count unchanged. */
export function recordDuelWin(roomId: string): number {
  const storage = getStorage();
  const rooms = storage.get<string[]>(DUEL_WINS_ROOMS_KEY, []);
  let count = storage.get<number>(DUEL_WINS_COUNT_KEY, 0);
  if (rooms.includes(roomId)) return count;
  rooms.push(roomId);
  count += 1;
  storage.set(DUEL_WINS_ROOMS_KEY, rooms);
  storage.set(DUEL_WINS_COUNT_KEY, count);
  return count;
}

/** Read the local duel-wins count without mutating it. */
export function getDuelWinsCount(): number {
  return getStorage().get<number>(DUEL_WINS_COUNT_KEY, 0);
}

// ─── Duels ─────────────────────────────────────────────────────────────────

export interface DuelFlowInput extends DuelResultInput {
  /** Did the player earn a crown / perfect solve in the duel? */
  perfect?: boolean;
}

export async function submitDuelResult(
  input: DuelFlowInput,
): Promise<SubmitFlowResult> {
  const events: AchievementEvent[] = [{ kind: 'duelCompleted' }];
  if (input.won) events.push({ kind: 'duelWon' });
  if (input.won && input.perfect) {
    events.push({ kind: 'duelPerfectWin' });
  }
  const [scores, achievements] = await Promise.all([
    gameCenterService.submitScores(buildDuelSubmissions(input)),
    reportAchievementsWithProgress(evaluateAll(events)),
  ]);
  return { scores, achievements };
}

// ─── Standalone events ─────────────────────────────────────────────────────

/** Fire the FRIENDLY_CHALLENGE achievement after the user picks a
 *  friend and the createFriendDuel call succeeds. No leaderboard
 *  submission for this event. */
export async function submitFriendChallengeFired(): Promise<SubmissionOutcome[]> {
  return reportAchievementsWithProgress(
    evaluate({ kind: 'friendChallenged' }),
  );
}
