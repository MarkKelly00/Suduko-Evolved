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
  hydrate: () => void;
  reset: () => void;
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
  };
}
