/**
 * Pure, stateless achievement rules engine.
 *
 * Maps semantic gameplay events (campaign level cleared, sprint
 * perfect, duel won, etc.) to the achievement IDs we should submit to
 * Game Center. Each event resolves to zero or more
 * `AchievementSubmission { achievementId, percentComplete }` rows.
 *
 * The engine is deliberately **stateless** — it doesn't know whether
 * an achievement has already been reported. That dedupe lives in
 * `achievementProgress.reportAchievementsWithProgress()` so that the
 * rules can be tested in isolation from storage.
 *
 * Two patterns of achievement output:
 *
 *   - **Single-trigger 100%** — events like "first level cleared" or
 *     "first crown earned" submit a single 100% row. The progress
 *     tracker dedupes future submissions of the same row.
 *
 *   - **Count-based progress** — events like `starsUpdated` submit a
 *     percent based on the current count vs. the achievement's
 *     threshold. Apple's leaderboards take the highest-ever percent,
 *     so we re-submit on every tick until the row hits 100%, then the
 *     progress tracker locks it.
 *
 * Adding a new achievement: append a new event variant + a `case`
 * branch here, and add the matching tests. No call sites need to
 * change as long as the existing screens emit the right event.
 */

import {
  GAME_CENTER_ACHIEVEMENTS,
  type AchievementSubmission,
} from '@/services/gameCenter';

// ─── Event types ───────────────────────────────────────────────────────────

export type AchievementEvent =
  | CampaignLevelCompletedEvent
  | CrownEarnedEvent
  | StarsUpdatedEvent
  | CrownsUpdatedEvent
  | WorldProgressUpdatedEvent
  | SprintCompletedEvent
  | SprintPerfectCompletedEvent
  | DuelCompletedEvent
  | DuelWonEvent
  | DuelPerfectWinEvent
  | FriendChallengedEvent
  | MultiRegionCompletionEvent
  | NoHintClearEvent
  | PausedAndCompletedEvent;

interface CampaignLevelCompletedEvent {
  kind: 'campaignLevelCompleted';
  /** 1–30. The act-bucket lookup uses this index. */
  level: number;
}
interface CrownEarnedEvent {
  kind: 'crownEarned';
}
interface StarsUpdatedEvent {
  kind: 'starsUpdated';
  /** Sum across all level entries. Cap: 90 (3★ × 30 levels). */
  totalStars: number;
}
interface CrownsUpdatedEvent {
  kind: 'crownsUpdated';
  /** Count of level entries with crown=true. Cap: 30. */
  totalCrowns: number;
}
interface WorldProgressUpdatedEvent {
  kind: 'worldProgressUpdated';
  /** 0..10 levels cleared in each act. */
  seedGroveCleared: number;
  moonvineStreamCleared: number;
  oracleBloomCleared: number;
}
interface SprintCompletedEvent {
  kind: 'sprintCompleted';
  /** True iff the player actually finished the puzzle within the
   *  3-minute timer (vs. ran out of time). */
  cleared: boolean;
}
interface SprintPerfectCompletedEvent {
  kind: 'sprintPerfectCompleted';
}
interface DuelCompletedEvent {
  kind: 'duelCompleted';
}
interface DuelWonEvent {
  kind: 'duelWon';
}
interface DuelPerfectWinEvent {
  kind: 'duelPerfectWin';
}
interface FriendChallengedEvent {
  kind: 'friendChallenged';
}
interface MultiRegionCompletionEvent {
  kind: 'multiRegionCompletion';
  /** Number of rows/columns/3×3 regions completed by a single placement. */
  regionCount: number;
}
interface NoHintClearEvent {
  kind: 'noHintClear';
}
interface PausedAndCompletedEvent {
  kind: 'pausedAndCompleted';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.min(100, Math.max(0, (num / denom) * 100));
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Convert a single semantic event into the list of Game Center
 * achievement submissions it should produce. Pure function — no
 * storage, no network, no side effects. Easy to test.
 */
export function evaluate(event: AchievementEvent): AchievementSubmission[] {
  const A = GAME_CENTER_ACHIEVEMENTS;
  switch (event.kind) {
    case 'campaignLevelCompleted':
      return [{ achievementId: A.FIRST_BLOOM, percentComplete: 100 }];

    case 'crownEarned':
      return [{ achievementId: A.PERFECT_BLOOM, percentComplete: 100 }];

    case 'starsUpdated':
      return [
        {
          achievementId: A.STAR_COLLECTOR,
          percentComplete: pct(event.totalStars, 30),
        },
        {
          achievementId: A.STAR_HARMONY,
          percentComplete: pct(event.totalStars, 60),
        },
        {
          achievementId: A.PERFECT_CONSTELLATION,
          percentComplete: pct(event.totalStars, 90),
        },
      ];

    case 'crownsUpdated':
      return [
        {
          achievementId: A.CROWNED_LOGIC,
          percentComplete: pct(event.totalCrowns, 10),
        },
        {
          achievementId: A.CROWN_GARDEN,
          percentComplete: pct(event.totalCrowns, 30),
        },
      ];

    case 'worldProgressUpdated': {
      const totalCleared =
        event.seedGroveCleared +
        event.moonvineStreamCleared +
        event.oracleBloomCleared;
      return [
        {
          achievementId: A.SEED_GROVE_COMPLETE,
          percentComplete: pct(event.seedGroveCleared, 10),
        },
        {
          achievementId: A.MOONVINE_STREAM_COMPLETE,
          percentComplete: pct(event.moonvineStreamCleared, 10),
        },
        {
          achievementId: A.ORACLE_BLOOM_COMPLETE,
          percentComplete: pct(event.oracleBloomCleared, 10),
        },
        {
          achievementId: A.LOGIC_GARDEN_COMPLETE,
          percentComplete: pct(totalCleared, 30),
        },
      ];
    }

    case 'sprintCompleted':
      // Only fire LIGHTNING_SOLVE on a real clear — running out the
      // 3-minute timer doesn't count.
      return event.cleared
        ? [{ achievementId: A.LIGHTNING_SOLVE, percentComplete: 100 }]
        : [];

    case 'sprintPerfectCompleted':
      return [{ achievementId: A.PERFECT_SPRINT, percentComplete: 100 }];

    case 'duelCompleted':
      return [{ achievementId: A.FIRST_DUEL, percentComplete: 100 }];

    case 'duelWon':
      return [{ achievementId: A.LOGIC_RIVAL, percentComplete: 100 }];

    case 'duelPerfectWin':
      return [{ achievementId: A.PERFECT_RIVALRY, percentComplete: 100 }];

    case 'friendChallenged':
      return [{ achievementId: A.FRIENDLY_CHALLENGE, percentComplete: 100 }];

    case 'multiRegionCompletion':
      return event.regionCount >= 3
        ? [{ achievementId: A.PERFECT_HARMONY, percentComplete: 100 }]
        : [];

    case 'noHintClear':
      return [{ achievementId: A.NO_HINTS_NEEDED, percentComplete: 100 }];

    case 'pausedAndCompleted':
      return [{ achievementId: A.TAKE_A_BREATH, percentComplete: 100 }];
  }
}

/**
 * Convenience: evaluate a list of events and merge the results,
 * de-duping by achievement ID and keeping the maximum percentComplete
 * across duplicates. Useful at result-screen sites where multiple
 * events fire at once (e.g. campaignLevelCompleted + starsUpdated +
 * crownsUpdated + worldProgressUpdated).
 */
export function evaluateAll(
  events: readonly AchievementEvent[],
): AchievementSubmission[] {
  const merged = new Map<string, AchievementSubmission>();
  for (const e of events) {
    for (const sub of evaluate(e)) {
      const existing = merged.get(sub.achievementId);
      if (
        !existing ||
        sub.percentComplete > existing.percentComplete
      ) {
        merged.set(sub.achievementId, sub);
      }
    }
  }
  return Array.from(merged.values());
}
