import { create } from 'zustand';
import {
  STORAGE_KEYS,
  defaultProgress,
  migrateProgress,
  type ProgressLevelEntry,
  type ProgressStoreV1,
  type TimeTrialBest,
} from '@/services/persistence/schema';
import { getStorage } from '@/services/persistence/storage';

interface RecordResultInput {
  levelId: string;
  /** Total stars earned this run. The stored entry keeps the best across runs. */
  stars: 1 | 2 | 3;
  crown: boolean;
  score: number;
  /** Run time in seconds. */
  time: number;
  /** XP earned this run. */
  xp: number;
  /** True iff this was a clean run (used to bump streak). */
  cleanRun: boolean;
  /** The next level id to unlock when this one is completed. */
  nextLevelId?: string;
}

interface ProgressActions {
  recordResult: (input: RecordResultInput) => void;
  setLastPlayedLevel: (levelId: string) => void;
  resetStreak: () => void;
  recordTimeTrialBest: (modeId: string, score: number, time: number) => void;
  /** Mark the one-time first-launch tutorial modal as Begun or Skipped.
   *  After this is called once, the modal never shows again on this device. */
  markTutorialSeen: () => void;
  /** Apply a cloud-fetched snapshot to the local progress store via
   *  best-of-best merge semantics. Used by `runCloudToLocalSync()`
   *  after a user authenticates so they see their cloud-stored
   *  progress on the current device. Local data — if any — is kept
   *  when it strictly beats the cloud entry; otherwise cloud wins.
   *  Also re-derives `unlockedLevels` so the saga map opens the
   *  expected next level after restore. */
  restoreFromCloud: (snapshot: CloudProgressSnapshot) => void;
  hydrate: () => void;
  reset: () => void;
}

export interface CloudProgressSnapshot {
  levels: Record<string, ProgressLevelEntry>;
  timeTrialBests: Record<string, TimeTrialBest>;
  totalXP: number;
  /** Cloud-stored streak. As of build 12 this is always 0 (no code path
   *  uploads it), but the field is wired up so that whenever a streak-
   *  upload path is added, the restore picks it up automatically. */
  currentStreak: number;
}

export type ProgressState = ProgressStoreV1 & ProgressActions & {
  /** Convenience selector: is this level unlocked? */
  isUnlocked: (levelId: string) => boolean;
  /** Convenience selector: best entry for this level (if any). */
  getLevelEntry: (levelId: string) => ProgressLevelEntry | null;
};

const initial: ProgressStoreV1 = defaultProgress();

function persist(state: ProgressStoreV1): void {
  const payload: ProgressStoreV1 = {
    version: 1,
    levels: state.levels,
    totalXP: state.totalXP,
    currentStreak: state.currentStreak,
    lastPlayedLevel: state.lastPlayedLevel,
    unlockedLevels: state.unlockedLevels,
    timeTrialBests: state.timeTrialBests,
    completedLevelIds: state.completedLevelIds,
    hasSeenTutorial: state.hasSeenTutorial,
  };
  getStorage().set(STORAGE_KEYS.progress, payload);
}

function mergeBest(prev: ProgressLevelEntry | undefined, next: Omit<ProgressLevelEntry, 'completedAt'>, completedAt: number): ProgressLevelEntry {
  if (!prev) return { ...next, completedAt };
  // Keep the higher of stars; for the same stars, keep best score; for the
  // same score, keep best time.
  const stars = Math.max(prev.stars, next.stars) as 1 | 2 | 3;
  const crown = prev.crown || next.crown;
  const bestScore = Math.max(prev.bestScore, next.bestScore);
  const bestTime = next.bestTime > 0 && (prev.bestTime <= 0 || next.bestTime < prev.bestTime)
    ? next.bestTime
    : prev.bestTime;
  return {
    stars,
    crown,
    bestScore,
    bestTime,
    completedAt: Math.max(prev.completedAt, completedAt),
  };
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...initial,
  recordResult: (input) => {
    const state = get();
    const merged = mergeBest(
      state.levels[input.levelId],
      { stars: input.stars, crown: input.crown, bestScore: input.score, bestTime: input.time },
      Date.now(),
    );
    const levels = { ...state.levels, [input.levelId]: merged };
    const completedLevelIds = state.completedLevelIds.includes(input.levelId)
      ? state.completedLevelIds
      : [...state.completedLevelIds, input.levelId];
    const unlockedLevels = input.nextLevelId && !state.unlockedLevels.includes(input.nextLevelId)
      ? [...state.unlockedLevels, input.nextLevelId]
      : state.unlockedLevels;
    const next: ProgressStoreV1 = {
      version: 1,
      levels,
      totalXP: state.totalXP + Math.max(0, input.xp),
      currentStreak: input.cleanRun ? state.currentStreak + 1 : 0,
      lastPlayedLevel: input.levelId,
      unlockedLevels,
      timeTrialBests: state.timeTrialBests,
      completedLevelIds,
      hasSeenTutorial: state.hasSeenTutorial,
    };
    set(next);
    persist(next);
  },
  setLastPlayedLevel: (levelId) => {
    const next: ProgressStoreV1 = { ...progressSlice(get()), lastPlayedLevel: levelId };
    set(next);
    persist(next);
  },
  resetStreak: () => {
    const next: ProgressStoreV1 = { ...progressSlice(get()), currentStreak: 0 };
    set(next);
    persist(next);
  },
  markTutorialSeen: () => {
    if (get().hasSeenTutorial) return;
    const next: ProgressStoreV1 = { ...progressSlice(get()), hasSeenTutorial: true };
    set(next);
    persist(next);
  },
  restoreFromCloud: (snapshot) => {
    const state = get();

    // 1. Per-level merge — keep the better of local and cloud per ID.
    const mergedLevels: Record<string, ProgressLevelEntry> = { ...state.levels };
    for (const [levelId, cloudEntry] of Object.entries(snapshot.levels)) {
      mergedLevels[levelId] = mergeBest(
        state.levels[levelId],
        {
          stars: cloudEntry.stars,
          crown: cloudEntry.crown,
          bestScore: cloudEntry.bestScore,
          bestTime: cloudEntry.bestTime,
        },
        cloudEntry.completedAt,
      );
    }

    // 2. Per-mode time-trial merge — keep higher score; same score
    // tiebreak on lower time.
    const mergedTtBests: Record<string, TimeTrialBest> = { ...state.timeTrialBests };
    for (const [modeId, cloudBest] of Object.entries(snapshot.timeTrialBests)) {
      const localBest = state.timeTrialBests[modeId];
      const cloudBeats =
        !localBest ||
        cloudBest.score > localBest.score ||
        (cloudBest.score === localBest.score && cloudBest.time < localBest.time);
      if (cloudBeats) mergedTtBests[modeId] = cloudBest;
    }

    // 3. Re-derive completedLevelIds + unlockedLevels from the merged
    // level set so the Saga Map opens the right next level after
    // restore. Each completed level unlocks itself + the next level
    // in the same world (capped at world's last index).
    const completedLevelIds = Array.from(
      new Set([...state.completedLevelIds, ...Object.keys(mergedLevels)]),
    );
    const unlockedSet = new Set(state.unlockedLevels);
    for (const levelId of completedLevelIds) {
      unlockedSet.add(levelId);
      const match = /^world1-level-(\d+)$/.exec(levelId);
      if (match) {
        const next = parseInt(match[1]!, 10) + 1;
        if (next >= 1 && next <= 30) unlockedSet.add(`world1-level-${next}`);
      }
    }

    // 4. XP — take max(local, cloud) so guest XP can never regress.
    const totalXP = Math.max(state.totalXP, Math.max(0, snapshot.totalXP));

    // 5. Streak — take max(local, cloud). As of today nothing uploads
    // the streak to cloud, so cloud value is 0 → effectively this
    // preserves whatever local has. When streak upload lands later,
    // the max-merge means returning users get their cloud-stored
    // streak back automatically.
    const currentStreak = Math.max(
      state.currentStreak,
      Math.max(0, snapshot.currentStreak),
    );

    const next: ProgressStoreV1 = {
      ...progressSlice(state),
      levels: mergedLevels,
      timeTrialBests: mergedTtBests,
      completedLevelIds,
      unlockedLevels: Array.from(unlockedSet),
      totalXP,
      currentStreak,
    };
    set(next);
    persist(next);
  },
  recordTimeTrialBest: (modeId, score, time) => {
    const state = get();
    const prev = state.timeTrialBests[modeId];
    const next: TimeTrialBest = prev && prev.score >= score
      ? prev
      : { score, time, date: Date.now() };
    const updated: ProgressStoreV1 = {
      ...progressSlice(state),
      timeTrialBests: { ...state.timeTrialBests, [modeId]: next },
    };
    set(updated);
    persist(updated);
  },
  hydrate: () => {
    const raw = getStorage().get<unknown>(STORAGE_KEYS.progress, undefined);
    const migrated = migrateProgress(raw);
    set(migrated);
    persist(migrated);
  },
  reset: () => {
    const def = defaultProgress();
    set(def);
    persist(def);
  },
  isUnlocked: (levelId) => get().unlockedLevels.includes(levelId),
  getLevelEntry: (levelId) => get().levels[levelId] ?? null,
}));

/** Project the persistable slice from a full store snapshot (excludes actions). */
function progressSlice(s: ProgressState): ProgressStoreV1 {
  return {
    version: 1,
    levels: s.levels,
    totalXP: s.totalXP,
    currentStreak: s.currentStreak,
    lastPlayedLevel: s.lastPlayedLevel,
    unlockedLevels: s.unlockedLevels,
    timeTrialBests: s.timeTrialBests,
    completedLevelIds: s.completedLevelIds,
    hasSeenTutorial: s.hasSeenTutorial,
  };
}
