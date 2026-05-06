/**
 * Time Trial orchestrator. Phase 3 ships scaffolding only; Phase 6 will wire
 * the 3-Minute Sprint mechanics, daily seeding, and leaderboard submission.
 */
import { hashSeed } from '@/game/engine';

export interface TimeTrialMode {
  id: string;
  name: string;
  durationSeconds: number;
  /** True for daily seeded modes (same seed for all players). */
  daily: boolean;
}

export const TIME_TRIAL_MODES: TimeTrialMode[] = [
  { id: 'sprint-3min', name: '3-Minute Sprint', durationSeconds: 180, daily: false },
  { id: 'daily-sprint', name: 'Daily Sprint', durationSeconds: 180, daily: true },
];

export function dailySeed(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}

export function deterministicSprintSeed(modeId: string, runNumber: number): string {
  return `tt-${modeId}-${hashSeed(`${runNumber}`)}`;
}
