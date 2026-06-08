/**
 * Tiny in-memory store of competitive "rival" signals per level, keyed by
 * level id. Populated opportunistically by `levelPreviewService` whenever a
 * preview is resolved (which already fetches friend/global bests) — so the
 * saga map never issues extra network calls just to draw markers, and shows
 * NOTHING for levels whose data hasn't loaded yet. Session-only (not persisted).
 *
 * Drives the optional `RivalMarker` map glints, gated by the
 * `enableMapRivalMarkers` feature flag.
 */
import { create } from 'zustand';

export interface RivalMarkerInfo {
  /** A friend currently has a better score than the player on this level. */
  friendBeat: boolean;
  /** Player once crowned this level but a friend/global score now leads it. */
  reclaimCrown: boolean;
  /** Player holds a crown here (worth a small aura even with no rival). */
  crowned: boolean;
}

interface RivalMarkerState {
  markers: Record<string, RivalMarkerInfo>;
  setMarker: (levelId: string, info: RivalMarkerInfo) => void;
  clear: () => void;
}

export const useRivalMarkerStore = create<RivalMarkerState>((set) => ({
  markers: {},
  setMarker: (levelId, info) =>
    set((s) => ({ markers: { ...s.markers, [levelId]: info } })),
  clear: () => set({ markers: {} }),
}));
