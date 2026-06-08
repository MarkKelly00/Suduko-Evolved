import { create } from 'zustand';
import {
  STORAGE_KEYS,
  defaultProgress,
  migrateProgress,
  type ProgressLevelEntry,
  type ProgressStoreV2,
  type TimeTrialBest,
} from '@/services/persistence/schema';
import { getStorage } from '@/services/persistence/storage';
import { nextLevelId } from '@/game/content/levels';
import { repairUnlockedWorlds } from '@/game/content/worldUnlockRules';

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
  /** Whether this run should extend the streak counter. Misnamed for
   *  history — `cleanRun` once required 0 mistakes + 0 hints, but
   *  that turned out to be too strict (a single mistake erased a long
   *  streak). Today the call site in GameScreen passes `true` on every
   *  successful completion, so the streak counts "consecutive levels
   *  cleared". Crown qualification (the actually-perfect run) still
   *  goes through `calculateStars()` in scoring.ts. */
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

export type ProgressState = ProgressStoreV2 & ProgressActions & {
  /** Convenience selector: is this level unlocked? */
  isUnlocked: (levelId: string) => boolean;
  /** Convenience selector: is this world unlocked? (`world1` always; `world2`
   *  once Logic Garden level 30 is cleared.) */
  isWorldUnlocked: (worldId: string) => boolean;
  /** Convenience selector: best entry for this level (if any). */
  getLevelEntry: (levelId: string) => ProgressLevelEntry | null;
};

const initial: ProgressStoreV2 = defaultProgress();

function persist(state: ProgressStoreV2): void {
  const payload: ProgressStoreV2 = {
    version: 2,
    levels: state.levels,
    totalXP: state.totalXP,
    currentStreak: state.currentStreak,
    lastPlayedLevel: state.lastPlayedLevel,
    unlockedLevels: state.unlockedLevels,
    unlockedWorlds: state.unlockedWorlds,
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
    // Re-derive which worlds are open from the (possibly newly extended) set of
    // completed levels — so finishing world1-level-30 opens Astral Nexus. Never
    // removes a world; only ever adds.
    const unlockedWorlds = repairUnlockedWorlds(state.unlockedWorlds, completedLevelIds);
    const next: ProgressStoreV2 = {
      version: 2,
      levels,
      totalXP: state.totalXP + Math.max(0, input.xp),
      currentStreak: input.cleanRun ? state.currentStreak + 1 : 0,
      lastPlayedLevel: input.levelId,
      unlockedLevels,
      unlockedWorlds,
      timeTrialBests: state.timeTrialBests,
      completedLevelIds,
      hasSeenTutorial: state.hasSeenTutorial,
    };
    set(next);
    persist(next);
  },
  setLastPlayedLevel: (levelId) => {
    const next: ProgressStoreV2 = { ...progressSlice(get()), lastPlayedLevel: levelId };
    set(next);
    persist(next);
  },
  resetStreak: () => {
    const next: ProgressStoreV2 = { ...progressSlice(get()), currentStreak: 0 };
    set(next);
    persist(next);
  },
  markTutorialSeen: () => {
    if (get().hasSeenTutorial) return;
    const next: ProgressStoreV2 = { ...progressSlice(get()), hasSeenTutorial: true };
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
    // restore. Each completed level unlocks itself + the next level.
    // `nextLevelId` is world-aware: it bridges world1-level-30 →
    // world2-level-31 (when Astral Nexus is enabled) and caps at level 60,
    // so World 2 progression re-derives correctly after a cloud restore.
    const completedLevelIds = Array.from(
      new Set([...state.completedLevelIds, ...Object.keys(mergedLevels)]),
    );
    const unlockedSet = new Set(state.unlockedLevels);
    for (const levelId of completedLevelIds) {
      unlockedSet.add(levelId);
      const next = nextLevelId(levelId);
      if (next) unlockedSet.add(next);
    }
    // Re-derive open worlds from the merged completion set (additive only).
    const unlockedWorlds = repairUnlockedWorlds(state.unlockedWorlds, completedLevelIds);

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

    const next: ProgressStoreV2 = {
      ...progressSlice(state),
      levels: mergedLevels,
      timeTrialBests: mergedTtBests,
      completedLevelIds,
      unlockedLevels: Array.from(unlockedSet),
      unlockedWorlds,
      totalXP,
      currentStreak,
    };
    set(next);
    persist(next);
  },
  recordTimeTrialBest: (modeId, score, time) => {
    // Defense-in-depth against the (now-fixed) 710/0:00 bug: refuse
    // any time-trial submission with time<=0. Real gameplay always
    // produces time > 0, so a zero is a reliable signature of the
    // bogus client-side completion path that previously polluted
    // the local store. Pair with the server-side
    // `CHECK (time_ms > 0)` constraint on time_trial_scores so the
    // class of bug is structurally impossible at both layers.
    if (!Number.isFinite(time) || time <= 0) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useProgressStore] rejecting recordTimeTrialBest with time<=0',
          { modeId, score, time },
        );
      }
      return;
    }
    const state = get();
    const prev = state.timeTrialBests[modeId];
    const next: TimeTrialBest = prev && prev.score >= score
      ? prev
      : { score, time, date: Date.now() };
    const updated: ProgressStoreV2 = {
      ...progressSlice(state),
      timeTrialBests: { ...state.timeTrialBests, [modeId]: next },
    };
    set(updated);
    persist(updated);
  },
  hydrate: () => {
    const raw = getStorage().get<unknown>(STORAGE_KEYS.progress, undefined);
    // Migration must never crash the app on boot. If anything throws, fall
    // back to defaults (a fresh, valid store) and log in dev — the player can
    // re-sync from cloud rather than face a white screen.
    let migrated: ProgressStoreV2;
    try {
      migrated = migrateProgress(raw);
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[useProgressStore.hydrate] migration failed; using defaults', err);
      }
      migrated = defaultProgress();
    }
    // One-time on-launch cleanup: strip any time-trial best with
    // time<=0. Players who installed build 14 or earlier may have
    // the 710/0:00 bogus entry cached in MMKV, and the merge logic
    // in restoreFromCloud only adopts cloud values when the cloud
    // score exceeds local — so a corrupted 710 would never get
    // overwritten by a real (lower) cloud best. Filtering here
    // gives every affected device an automatic recovery path on
    // next launch without requiring sign-out/sign-in.
    const cleanedBests: typeof migrated.timeTrialBests = {};
    for (const [modeId, best] of Object.entries(migrated.timeTrialBests)) {
      if (Number.isFinite(best.time) && best.time > 0) {
        cleanedBests[modeId] = best;
      } else if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useProgressStore.hydrate] dropping corrupted TT best',
          { modeId, best },
        );
      }
    }
    // Repair `unlockedWorlds` from the (migrated) completion set so a returning
    // player who had already cleared Logic Garden sees Astral Nexus open on the
    // first launch after this update — without any destructive reset.
    const unlockedWorlds = repairUnlockedWorlds(
      migrated.unlockedWorlds,
      migrated.completedLevelIds,
    );
    const sanitized = { ...migrated, timeTrialBests: cleanedBests, unlockedWorlds };
    set(sanitized);
    persist(sanitized);
  },
  reset: () => {
    // Preserve hasSeenTutorial across resets — it's a one-time
    // device-level UX flag, not account data. Earlier wipe-on-signout
    // was inadvertently re-showing the tutorial modal to returning
    // users every time they signed back in: reset() called
    // defaultProgress() which sets hasSeenTutorial=false, then the
    // home screen detected the flag was false and re-triggered the
    // tutorial. Keep this device-level breadcrumb survival-flagged.
    const def = defaultProgress();
    const preserved: ProgressStoreV2 = {
      ...def,
      hasSeenTutorial: get().hasSeenTutorial,
    };
    set(preserved);
    persist(preserved);
  },
  isUnlocked: (levelId) => get().unlockedLevels.includes(levelId),
  isWorldUnlocked: (worldId) => get().unlockedWorlds.includes(worldId),
  getLevelEntry: (levelId) => get().levels[levelId] ?? null,
}));

/** Project the persistable slice from a full store snapshot (excludes actions). */
function progressSlice(s: ProgressState): ProgressStoreV2 {
  return {
    version: 2,
    levels: s.levels,
    totalXP: s.totalXP,
    currentStreak: s.currentStreak,
    lastPlayedLevel: s.lastPlayedLevel,
    unlockedLevels: s.unlockedLevels,
    unlockedWorlds: s.unlockedWorlds,
    timeTrialBests: s.timeTrialBests,
    completedLevelIds: s.completedLevelIds,
    hasSeenTutorial: s.hasSeenTutorial,
  };
}
