/**
 * levelPreviewService
 *
 * Single point that composes everything the Level Preview Modal needs, for ANY
 * level across both worlds (global level 1–60):
 *   • level metadata (world, act, landmark, biome, difficulty, lock state)
 *   • the player's local best (from useProgressStore)
 *   • the player's cloud-best (richer fields like mistakes/hints) when authed
 *   • the friend best + global best (Supabase)
 *   • derived competitive hints: score-to-beat, reclaim-crown, crown criteria
 *
 * World-aware: `levelIdForGlobal` maps 1..30 → world1, 31..60 → world2, so the
 * Supabase calls (which filter by the string level_id) need no change. Designed
 * to fail gracefully — every Supabase call is wrapped, missing data resolves to
 * null, never throws.
 */
import { useProgressStore } from '@/game/state/useProgressStore';
import {
  ALL_LEVELS,
  levelIdForGlobal,
} from '@/game/content/levels';
import { WORLD_1 } from '@/game/content/worlds';
import {
  getWorldDefForGlobalLevel,
  getActForGlobalLevel,
} from '@/components/map/worldRegistry';
import type { MapLandmark, WorldAct } from '@/components/map/mapLayout';
import { WORLD_1_ACTS } from '@/components/map/mapLayout';
import { useRivalMarkerStore } from '@/components/map/rivalMarkerStore';
import {
  getYourBestForLevel,
  getFriendBestForLevel,
  getGlobalBestForLevel,
  type YourBestRow,
} from '@/services/supabase/leaderboardService';
import type { LeaderboardRow } from '@/services/supabase/supabaseTypes';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LevelPreviewBest {
  isLocalOnly: boolean;
  score: number;
  /** Time in milliseconds. */
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
  isSelf: boolean;
}

export interface LevelPreview {
  levelId: string;
  /** Global level number, 1–60. (Field name kept for call-site compatibility.) */
  levelIndex: number;
  worldId: string;
  worldName: string;
  worldNumber: number;
  /** True for World 2+ — drives prestige-oriented modal copy. */
  prestige: boolean;
  act: WorldAct;
  landmark?: MapLandmark;
  biome?: string;
  difficulty: string;
  isActFinale: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  /** When locked WITHIN a world, the prior level to clear. Null at a world
   *  boundary (use `worldGate` instead) or the very first level. */
  prerequisiteLevelIndex: number | null;
  /** Set when the lock is a whole-world gate (e.g. entering Astral Nexus
   *  before finishing Logic Garden). Null for in-world locks. */
  worldGate: { requiredWorldName: string; message: string } | null;
  yourBest: LevelPreviewBest | null;
  friendBest: LevelPreviewPeer | null;
  globalBest: LevelPreviewPeer | null;
  /** The score the player should aim to beat, with its source. */
  scoreToBeat: { label: string; score: number; source: 'personal' | 'friend' | 'global' } | null;
  /** True when the player previously crowned this level but a friend/global
   *  score now leads it — drives the "Reclaim Crown" CTA. */
  reclaimCrown: boolean;
  /** What a crown requires here (tighter in World 2). */
  crownCriteria: { targetTimeSeconds: number; maxMistakes: number; maxHints: number };
  targets: {
    twoStarThreshold: number;
    threeStarThreshold: number;
    targetTimeSeconds: number;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function rowToPeer(row: LeaderboardRow, selfUserId: string | null): LevelPreviewPeer {
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

function pickBest(
  cloud: YourBestRow | null,
  localEntry:
    | { stars: 1 | 2 | 3; crown: boolean; bestScore: number; bestTime: number; completedAt: number }
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

interface PreviewBase {
  levelId: string;
  globalLevel: number;
  worldId: string;
  worldName: string;
  worldNumber: number;
  prestige: boolean;
  act: WorldAct;
  landmark?: MapLandmark;
  biome?: string;
  difficulty: string;
  isActFinale: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  prerequisiteLevelIndex: number | null;
  worldGate: { requiredWorldName: string; message: string } | null;
  targets: { twoStarThreshold: number; threeStarThreshold: number; targetTimeSeconds: number };
  crownCriteria: { targetTimeSeconds: number; maxMistakes: number; maxHints: number };
  localEntry:
    | { stars: 1 | 2 | 3; crown: boolean; bestScore: number; bestTime: number; completedAt: number }
    | null;
}

/** World-aware synchronous resolution shared by the shell + full builders. */
function resolveBase(globalLevel: number): PreviewBase {
  const id = levelIdForGlobal(globalLevel);
  const world = getWorldDefForGlobalLevel(globalLevel);
  const meta = ALL_LEVELS.find((l) => l.index === globalLevel);
  const act = getActForGlobalLevel(globalLevel);
  const node = world.layout.find((n) => n.level === globalLevel);
  const isFinale = act.toLevel === globalLevel;

  const progress = useProgressStore.getState();
  const localEntry = progress.levels[id] ?? null;
  const isLocked = !progress.unlockedLevels.includes(id);
  const isCompleted = !!localEntry;
  const isCurrent = progress.lastPlayedLevel === id && !isCompleted;
  const worldUnlocked = progress.unlockedWorlds.includes(world.id);

  // Distinguish an in-world lock (clear the prior level) from a whole-world
  // gate (finish the previous world to open this one).
  let prerequisiteLevelIndex: number | null = null;
  let worldGate: { requiredWorldName: string; message: string } | null = null;
  if (isLocked) {
    if (!worldUnlocked && world.worldNumber > 1) {
      worldGate = {
        requiredWorldName: WORLD_1.name,
        message: `Complete ${WORLD_1.name} to open the path.`,
      };
    } else if (globalLevel > world.globalLevelStart) {
      prerequisiteLevelIndex = globalLevel - 1;
    }
  }

  const targets = {
    twoStarThreshold: meta?.twoStarThreshold ?? 0,
    threeStarThreshold: meta?.threeStarThreshold ?? 0,
    targetTimeSeconds: meta?.targetTimeSeconds ?? 0,
  };

  return {
    levelId: id,
    globalLevel,
    worldId: world.id,
    worldName: world.name,
    worldNumber: world.worldNumber,
    prestige: world.worldNumber > 1,
    act,
    landmark: node?.landmark,
    biome: node?.biome,
    difficulty: meta?.difficulty ?? 'easy',
    isActFinale: isFinale,
    isLocked,
    isCompleted,
    isCurrent,
    prerequisiteLevelIndex,
    worldGate,
    targets,
    crownCriteria: { targetTimeSeconds: targets.targetTimeSeconds, maxMistakes: 0, maxHints: 0 },
    localEntry,
  };
}

/** Compute score-to-beat + reclaim-crown from the resolved bests. */
function deriveCompetitive(
  yourBest: LevelPreviewBest | null,
  friendBest: LevelPreviewPeer | null,
  globalBest: LevelPreviewPeer | null,
): {
  scoreToBeat: LevelPreview['scoreToBeat'];
  reclaimCrown: boolean;
} {
  const yourScore = yourBest?.score ?? 0;
  const friendScore = friendBest?.score ?? 0;
  // A self-held global row isn't a rival to beat.
  const globalScore = globalBest && !globalBest.isSelf ? globalBest.score : 0;

  let scoreToBeat: LevelPreview['scoreToBeat'] = null;
  // Prefer the strongest rival score that exceeds the player's.
  if (globalScore > yourScore && globalScore >= friendScore) {
    scoreToBeat = { label: 'Global best', score: globalScore, source: 'global' };
  } else if (friendScore > yourScore) {
    scoreToBeat = { label: 'Friend to beat', score: friendScore, source: 'friend' };
  } else if (yourScore > 0) {
    scoreToBeat = { label: 'Your best', score: yourScore, source: 'personal' };
  }

  const rivalLeads =
    (friendBest != null && friendBest.score > yourScore) ||
    (globalScore > yourScore);
  const reclaimCrown = !!yourBest?.crown && rivalLeads;

  return { scoreToBeat, reclaimCrown };
}

function assemble(
  base: PreviewBase,
  yourBest: LevelPreviewBest | null,
  friendBest: LevelPreviewPeer | null,
  globalBest: LevelPreviewPeer | null,
): LevelPreview {
  const { scoreToBeat, reclaimCrown } = deriveCompetitive(yourBest, friendBest, globalBest);
  return {
    levelId: base.levelId,
    levelIndex: base.globalLevel,
    worldId: base.worldId,
    worldName: base.worldName,
    worldNumber: base.worldNumber,
    prestige: base.prestige,
    act: base.act,
    landmark: base.landmark,
    biome: base.biome,
    difficulty: base.difficulty,
    isActFinale: base.isActFinale,
    isLocked: base.isLocked,
    isCompleted: base.isCompleted,
    isCurrent: base.isCurrent,
    prerequisiteLevelIndex: base.prerequisiteLevelIndex,
    worldGate: base.worldGate,
    yourBest,
    friendBest,
    globalBest,
    scoreToBeat,
    reclaimCrown,
    crownCriteria: base.crownCriteria,
    targets: base.targets,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build a full LevelPreview for the modal. Cloud calls run in parallel and
 * each is independent so a slow/failed friend RPC doesn't block the global
 * card. `globalLevel` is 1–60.
 */
export async function getLevelPreview(globalLevel: number): Promise<LevelPreview> {
  const base = resolveBase(globalLevel);

  let yourBestRow: YourBestRow | null = null;
  let friendBestRow: LeaderboardRow | null = null;
  let globalBestRow: LeaderboardRow | null = null;
  if (!base.isLocked) {
    [yourBestRow, friendBestRow, globalBestRow] = await Promise.all([
      getYourBestForLevel(base.levelId).catch(() => null),
      getFriendBestForLevel(base.levelId).catch(() => null),
      getGlobalBestForLevel(base.levelId).catch(() => null),
    ]);
  }

  const selfUserId = yourBestRow?.user_id ?? null;
  const yourBest = pickBest(yourBestRow, base.localEntry);
  const friendBest = friendBestRow ? rowToPeer(friendBestRow, selfUserId) : null;

  let globalBest: LevelPreviewPeer | null = null;
  if (globalBestRow) {
    const isSelf = !!selfUserId && globalBestRow.user_id === selfUserId;
    globalBest = isSelf && yourBestRow ? yourRowToPeer(yourBestRow) : rowToPeer(globalBestRow, selfUserId);
  }

  const preview = assemble(base, yourBest, friendBest, globalBest);

  // Feed the optional map rival markers (no extra network — reuse what we
  // just fetched). Only meaningful for playable levels.
  if (!base.isLocked) {
    const friendBeat = !!friendBest && (!yourBest || friendBest.score > yourBest.score);
    useRivalMarkerStore.getState().setMarker(base.levelId, {
      friendBeat,
      reclaimCrown: preview.reclaimCrown,
      crowned: !!yourBest?.crown,
    });
  }

  return preview;
}

/**
 * Synchronous, local-only preview shell — renders the modal INSTANTLY on tap
 * before the cloud fetch resolves. `getLevelPreview` then patches in
 * friend/global data when ready. `globalLevel` is 1–60.
 */
export function getLocalLevelPreviewShell(globalLevel: number): LevelPreview {
  const base = resolveBase(globalLevel);
  const yourBest = pickBest(null, base.localEntry);
  return assemble(base, yourBest, null, null);
}

// Re-export for consumers that want them.
export { WORLD_1_ACTS };
