/**
 * Achievement-unlock toast queue.
 *
 * `<AchievementUnlockToast>` renders the head of `queue`. When the queue
 * is non-empty, the toast slides in, holds, then calls `dismiss()` which
 * pops the head; the next unlock (if any) animates in next.
 *
 * Memory-only — we deliberately do NOT persist the queue. If the app is
 * force-killed mid-toast, the achievement itself is already saved in
 * MMKV (`gameCenter.reportedAchievements`) so the next launch starts
 * clean rather than replaying yesterday's toasts.
 */

import { create } from 'zustand';

import type { GameCenterAchievementId } from '@/services/gameCenter';

interface AchievementToastState {
  queue: GameCenterAchievementId[];
  enqueue: (id: GameCenterAchievementId) => void;
  dismiss: () => void;
  clear: () => void;
}

export const useAchievementToastStore = create<AchievementToastState>((set) => ({
  queue: [],
  enqueue: (id) =>
    set((state) => {
      // Drop duplicate-of-head — fires twice in quick succession from
      // overlapping events at result screens otherwise.
      if (state.queue[0] === id) return state;
      // Avoid stacking the same id multiple times in the same session.
      if (state.queue.includes(id)) return state;
      return { queue: [...state.queue, id] };
    }),
  dismiss: () =>
    set((state) => ({
      queue: state.queue.length > 0 ? state.queue.slice(1) : state.queue,
    })),
  clear: () => set({ queue: [] }),
}));
