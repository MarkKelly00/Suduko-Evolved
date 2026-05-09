/**
 * levelPreviewService
 *
 * Single point that composes everything the Level Preview Modal needs:
 *   • level metadata (act, landmark, biome, difficulty, lock state)
 *   • the player's local best (from useProgressStore)
 *   • the player's cloud-best (richer fields like mistakes/hints) when authed
 *   • the friend best (Supabase, single non-self row)
 *   • the global best (Supabase, top row)
 *
 * Designed to fail gracefully — every Supabase call is wrapped, and missing
 * data resolves to null so callers can render polished empty states. Never
 * throws.
 */
import { useProgressStore } from '@/game/state/useProgressStore';
import { WORLD_1 } from '@/game/content/worlds';
import {
  WORLD_1_LEVELS,
  levelId as makeLevelId,
} from '@/game/content/levels';
import {
  WORLD_1_ACTS,
  getNodeLayoutForLevel,
  getWorldActForLevel,
  isActFinaleLevel,
  type MapLandmark,
  type WorldAct,
} from '@/components/map/mapLayout';
import {
  getYourBestForLevel,
  getFriendBestForLevel,
  getGlobalBestForLevel,
  type YourBestRow,
} from '@/services/supabase/leaderboardService';
import type { LeaderboardRow } from '@/services/supabase/supabaseTypes';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LevelPreviewBest {
  /** Local-only flag — true when the data came from useProgressStore and
   *  has no cloud row yet. UI uses this to hide mistakes/hints (which only
   *  exist in level_scores). */
  isLocalOnly: boolean;
  score: number;
  /** Time in milliseconds. Local store stores seconds; we normalize. */
  timeMs: number;
  mistakes?: number;
  hints?: number;
  stars: 0 | 1 | 2 | 3;
  crown: boolean;
  completedAt?: string;
}

export interface LevelPreviewPeer {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  timeMs: number;
  stars: number;
  crown: boolean;
  /** True iff the row's user_id is the calling user. Used to render the
   *  "You hold the #1 spot" celebratory state in the Global card. */
  isSelf: boolean;
}

export interface LevelPreview {
  levelId: string;
  levelIndex: number;
  worldId: string;
  worldName: string;
  act: WorldAct;
  landmark?: MapLandmark;
  biome?: string;
  difficulty: string;
  isActFinale: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  /** When isLocked, the level the player must clear first (or null when
   *  the very first level is locked, which shouldn't happen in practice). */
  prerequisiteLevelIndex: number | null;
  yourBest: LevelPreviewBest | null;
  friendBest: LevelPreviewPeer | null;
  globalBest: LevelPreviewPeer | null;
  /** Targets to compare against — useful for the "Best score to beat" hint. */
  targets: {
    twoStarThreshold: number;
    threeStarThreshold: number;
    targetTimeSeconds: number;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function rowToPeer(
  row: LeaderboardRow,
  selfUserId: string | null,
): LevelPreviewPeer {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name || row.username || 'Player',
    avatarUrl: row.avatar_url ?? '',
    score: row.score,
    timeMs: row.time_ms,
    stars: row.stars ?? 0,
    crown: !!row.crown,
    isSelf: !!selfUserId && row.user_id === selfUserId,
  };
}

function yourRowToPeer(row: YourBestRow): LevelPreviewPeer {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name || row.username || 'You',
    avatarUrl: row.avatar_url,
    score: row.score,
    timeMs: row.time_ms,
    stars: row.stars,
    crown: row.crown,
    isSelf: true,
  };
}

/** Build the LevelPreviewBest from whichever source yielded data. Cloud row
 *  wins (richer fields); falls back to local store. Returns null if neither
 *  source has anything. */
function pickBest(
  cloud: YourBestRow | null,
  localEntry:
    | {
        stars: 1 | 2 | 3;
        crown: boolean;
        bestScore: number;
        bestTime: number;
        completedAt: number;
      }
    | null,
): LevelPreviewBest | null {
  if (cloud) {
    return {
      isLocalOnly: false,
      score: cloud.score,
      timeMs: cloud.time_ms,
      mistakes: cloud.mistakes,
      hints: cloud.hints,
      stars: cloud.stars as 0 | 1 | 2 | 3,
      crown: cloud.crown,
      completedAt: cloud.completed_at,
    };
  }
  if (localEntry) {
    return {
      isLocalOnly: true,
      score: localEntry.bestScore,
      timeMs: Math.round(localEntry.bestTime * 1000),
      stars: localEntry.stars,
      crown: localEntry.crown,
      completedAt: new Date(localEntry.completedAt).toISOString(),
    };
  }
  return null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build a full LevelPreview for the modal. Cloud calls run in parallel and
 * each is independent so a slow/failed friend RPC doesn't block the global
 * card. Pure async — does not subscribe to the store; callers should pass
 * a fresh selection of progress state if they want reactivity.
 */
export async function getLevelPreview(
  levelIndex: number,
): Promise<LevelPreview> {
  // ─── Synchronous inputs from local sources ──────────────────────────────
  const id = makeLevelId(levelIndex);
  const meta = WORLD_1_LEVELS.find((l) => l.index === levelIndex);
  const layout = getNodeLayoutForLevel(levelIndex);
  const act = getWorldActForLevel(levelIndex);
  const isFinale = isActFinaleLevel(levelIndex);

  const progress = useProgressStore.getState();
  const localEntry = progress.levels[id] ?? null;
  const isLocked = !progress.unlockedLevels.includes(id);
  const isCompleted = !!localEntry;
  const isCurrent = progress.lastPlayedLevel === id && !isCompleted;

  const prerequisiteLevelIndex =
    isLocked && levelIndex > 1 ? levelIndex - 1 : null;

  // ─── Cloud fetches (best-effort, independent) ───────────────────────────
  // Skip everything for locked levels — there's no scoreboard to show until
  // the player can play it. Saves three round-trips on every locked tap.
  let yourBestRow: YourBestRow | null = null;
  let friendBestRow: LeaderboardRow | null = null;
  let globalBestRow: LeaderboardRow | null = null;
  if (!isLocked) {
    [yourBestRow, friendBestRow, globalBestRow] = await Promise.all([
      getYourBestForLevel(id).catch(() => null),
      getFriendBestForLevel(id).catch(() => null),
      getGlobalBestForLevel(id).catch(() => null),
    ]);
  }

  // The caller's user id (best derived from the cloud row when present;
  // otherwise null and we just don't tag isSelf). This is enough to detect
  // the "You hold the #1 spot" case for the global card.
  const selfUserId = yourBestRow?.user_id ?? null;

  // ─── Compose ────────────────────────────────────────────────────────────
  const targets = {
    twoStarThreshold: meta?.twoStarThreshold ?? 0,
    threeStarThreshold: meta?.threeStarThreshold ?? 0,
    targetTimeSeconds: meta?.targetTimeSeconds ?? 0,
  };

  const yourBest = pickBest(yourBestRow, localEntry);
  const friendBest = friendBestRow
    ? rowToPeer(friendBestRow, selfUserId)
    : null;
  // Special-case: if the global best is the caller themselves, prefer the
  // richer YourBestRow data so the celebratory "You hold the #1 spot" card
  // shows the same numbers the user just earned.
  let globalBest: LevelPreviewPeer | null = null;
  if (globalBestRow) {
    const isSelf =
      !!selfUserId && globalBestRow.user_id === selfUserId;
    if (isSelf && yourBestRow) {
      globalBest = yourRowToPeer(yourBestRow);
    } else {
      globalBest = rowToPeer(globalBestRow, selfUserId);
    }
  }

  return {
    levelId: id,
    levelIndex,
    worldId: WORLD_1.id,
    worldName: WORLD_1.name,
    act,
    landmark: layout?.landmark,
    biome: layout?.biome,
    difficulty: meta?.difficulty ?? 'easy',
    isActFinale: isFinale,
    isLocked,
    isCompleted,
    isCurrent,
    prerequisiteLevelIndex,
    yourBest,
    friendBest,
    globalBest,
    targets,
  };
}

/**
 * Synchronous, local-only preview shell — used to render the modal
 * INSTANTLY on tap before the cloud fetch resolves. The async
 * `getLevelPreview` then patches in friend/global data when ready.
 */
export function getLocalLevelPreviewShell(levelIndex: number): LevelPreview {
  const id = makeLevelId(levelIndex);
  const meta = WORLD_1_LEVELS.find((l) => l.index === levelIndex);
  const layout = getNodeLayoutForLevel(levelIndex);
  const act = getWorldActForLevel(levelIndex);
  const isFinale = isActFinaleLevel(levelIndex);

  const progress = useProgressStore.getState();
  const localEntry = progress.levels[id] ?? null;
  const isLocked = !progress.unlockedLevels.includes(id);
  const isCompleted = !!localEntry;
  const isCurrent = progress.lastPlayedLevel === id && !isCompleted;

  return {
    levelId: id,
    levelIndex,
    worldId: WORLD_1.id,
    worldName: WORLD_1.name,
    act,
    landmark: layout?.landmark,
    biome: layout?.biome,
    difficulty: meta?.difficulty ?? 'easy',
    isActFinale: isFinale,
    isLocked,
    isCompleted,
    isCurrent,
    prerequisiteLevelIndex:
      isLocked && levelIndex > 1 ? levelIndex - 1 : null,
    yourBest: pickBest(null, localEntry),
    friendBest: null,
    globalBest: null,
    targets: {
      twoStarThreshold: meta?.twoStarThreshold ?? 0,
      threeStarThreshold: meta?.threeStarThreshold ?? 0,
      targetTimeSeconds: meta?.targetTimeSeconds ?? 0,
    },
  };
}

// Re-export for consumers that want them.
export { WORLD_1_ACTS };
