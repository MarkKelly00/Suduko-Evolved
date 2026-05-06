import {
  TIME_TRIAL_MODES,
  dailySeed,
  deterministicSprintSeed,
  getTimeTrialMode,
  synthesizeSprintLevel,
} from '../timeTrial';

describe('Time Trial helpers', () => {
  test('TIME_TRIAL_MODES exposes 3-Minute Sprint + Daily Sprint', () => {
    expect(TIME_TRIAL_MODES.length).toBeGreaterThanOrEqual(2);
    expect(TIME_TRIAL_MODES.find((m) => m.id === 'sprint-3min')).toBeTruthy();
    expect(TIME_TRIAL_MODES.find((m) => m.id === 'daily-sprint')).toBeTruthy();
  });

  test('all time trial modes are exactly 3 minutes (180s) for MVP', () => {
    for (const m of TIME_TRIAL_MODES) {
      expect(m.durationSeconds).toBe(180);
    }
  });

  test('getTimeTrialMode round-trips known ids and returns null for unknown', () => {
    expect(getTimeTrialMode('sprint-3min')?.id).toBe('sprint-3min');
    expect(getTimeTrialMode('does-not-exist')).toBeNull();
  });

  test('dailySeed is stable for the same UTC date', () => {
    const a = dailySeed(new Date(Date.UTC(2026, 4, 6, 9, 0, 0)));
    const b = dailySeed(new Date(Date.UTC(2026, 4, 6, 23, 30, 0)));
    expect(a).toBe(b);
    expect(a).toMatch(/^daily-2026-05-06$/);
  });

  test('dailySeed differs across UTC dates', () => {
    const a = dailySeed(new Date(Date.UTC(2026, 4, 6, 23, 30, 0)));
    const b = dailySeed(new Date(Date.UTC(2026, 4, 7, 0, 30, 0)));
    expect(a).not.toBe(b);
  });

  test('deterministicSprintSeed is deterministic per (modeId, runNumber)', () => {
    const a = deterministicSprintSeed('sprint-3min', 1);
    const b = deterministicSprintSeed('sprint-3min', 1);
    const c = deterministicSprintSeed('sprint-3min', 2);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  test('synthesizeSprintLevel produces a level the engine will accept', () => {
    const mode = getTimeTrialMode('sprint-3min')!;
    const seed = deterministicSprintSeed(mode.id, 42);
    const level = synthesizeSprintLevel(mode, seed);
    expect(level.id).toContain(mode.id);
    expect(level.seed).toBe(seed);
    expect(level.difficulty).toBe(mode.difficulty);
    expect(level.targetTimeSeconds).toBeGreaterThan(0);
    expect(level.twoStarThreshold).toBeGreaterThan(0);
    expect(level.threeStarThreshold).toBeGreaterThan(level.twoStarThreshold);
  });
});
