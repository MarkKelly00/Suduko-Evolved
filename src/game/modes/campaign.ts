/**
 * Thin orchestrator: takes a level id, looks up its definition, and starts a
 * game session. Centralizing here lets us add per-mode behaviour later
 * (special rules per world, daily-puzzle overrides) without touching
 * GameScreen.
 */
import { getLevelById, nextLevelId as resolveNextLevelId } from '@/game/content/levels';
import { useGameStore } from '@/game/state/useGameStore';
import { useProgressStore } from '@/game/state/useProgressStore';

export const campaign = {
  startLevel(levelId: string): boolean {
    const level = getLevelById(levelId);
    if (!level) return false;
    useGameStore.getState().startSession(level);
    useProgressStore.getState().setLastPlayedLevel(levelId);
    return true;
  },
  nextLevelId: resolveNextLevelId,
};
