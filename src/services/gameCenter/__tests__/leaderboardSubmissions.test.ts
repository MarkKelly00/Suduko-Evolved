/**
 * Tests for the leaderboard submission mappers + helpers.
 *
 * The full submitCampaignResult / submitSprintResult / submitDuelResult
 * orchestrators interact with the platform-bound gameCenterService
 * and would need extensive mocking to test directly. The pieces these
 * tests cover — the pure mappers + the local duel-wins counter — are
 * the parts most likely to drift silently from the App Store Connect
 * leaderboard configurations, so they're the priority.
 */

import {
  buildCampaignTotalsSubmissions,
  buildDuelSubmissions,
  buildSprintSubmissions,
  clampNonNegativeInt,
  isKnownLeaderboardId,
  secondsToCentiseconds,
} from '../gameCenterMappers';
import { GAME_CENTER_LEADERBOARDS } from '../gameCenterIds';
import {
  deriveCampaignTotals,
  getDuelWinsCount,
  recordDuelWin,
} from '../../../game/leaderboards/leaderboardSubmissions';
import { InMemoryStorage } from '../../persistence/storage';
import { setStorage } from '../../persistence/storage';

describe('gameCenterMappers — utility', () => {
  it('clampNonNegativeInt floors + clamps to >=0', () => {
    expect(clampNonNegativeInt(0)).toBe(0);
    expect(clampNonNegativeInt(5.7)).toBe(5);
    expect(clampNonNegativeInt(-3)).toBe(0);
    expect(clampNonNegativeInt(NaN)).toBe(0);
    expect(clampNonNegativeInt(Infinity)).toBe(0);
  });

  it('secondsToCentiseconds converts s → ms', () => {
    expect(secondsToCentiseconds(0)).toBe(0);
    expect(secondsToCentiseconds(1.5)).toBe(1500);
    expect(secondsToCentiseconds(134.32)).toBe(134320);
    expect(secondsToCentiseconds(-1)).toBe(0);
  });

  it('isKnownLeaderboardId guards against typos', () => {
    expect(
      isKnownLeaderboardId(GAME_CENTER_LEADERBOARDS.SPRINT_3MIN_SCORE),
    ).toBe(true);
    expect(isKnownLeaderboardId('com.bogus.id')).toBe(false);
  });
});

describe('buildCampaignTotalsSubmissions', () => {
  it('produces 2 entries — stars + crowns', () => {
    const out = buildCampaignTotalsSubmissions({
      totalStars: 15,
      totalCrowns: 3,
    });
    expect(out).toHaveLength(2);
    const stars = out.find(
      (s) => s.leaderboardId === GAME_CENTER_LEADERBOARDS.LOGIC_GARDEN_STARS,
    );
    const crowns = out.find(
      (s) => s.leaderboardId === GAME_CENTER_LEADERBOARDS.LOGIC_GARDEN_CROWNS,
    );
    expect(stars?.value).toBe(15);
    expect(crowns?.value).toBe(3);
  });
});

describe('buildSprintSubmissions', () => {
  it('always submits SPRINT_3MIN_SCORE', () => {
    const out = buildSprintSubmissions({
      score: 6181,
      timeSeconds: 0,
      cleared: false,
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.leaderboardId).toBe(
      GAME_CENTER_LEADERBOARDS.SPRINT_3MIN_SCORE,
    );
    expect(out[0]!.value).toBe(6181);
  });

  it('adds SPRINT_FASTEST_CLEAR (in ms) when cleared=true', () => {
    const out = buildSprintSubmissions({
      score: 6181,
      timeSeconds: 134.32,
      cleared: true,
    });
    expect(out).toHaveLength(2);
    const fast = out.find(
      (s) => s.leaderboardId === GAME_CENTER_LEADERBOARDS.SPRINT_FASTEST_CLEAR,
    );
    expect(fast?.value).toBe(134320);
  });

  it('skips fastest-clear when cleared=false', () => {
    const out = buildSprintSubmissions({
      score: 6181,
      timeSeconds: 180,
      cleared: false,
    });
    const fast = out.find(
      (s) => s.leaderboardId === GAME_CENTER_LEADERBOARDS.SPRINT_FASTEST_CLEAR,
    );
    expect(fast).toBeUndefined();
  });
});

describe('buildDuelSubmissions', () => {
  it('submits DUEL_BEST_SCORE always; DUEL_WINS only on win', () => {
    const won = buildDuelSubmissions({
      score: 5000,
      won: true,
      cumulativeWins: 7,
    });
    expect(won).toHaveLength(2);
    const wins = won.find(
      (s) => s.leaderboardId === GAME_CENTER_LEADERBOARDS.DUEL_WINS,
    );
    expect(wins?.value).toBe(7);

    const lost = buildDuelSubmissions({
      score: 3000,
      won: false,
      cumulativeWins: 7,
    });
    expect(lost).toHaveLength(1);
    expect(lost[0]!.leaderboardId).toBe(
      GAME_CENTER_LEADERBOARDS.DUEL_BEST_SCORE,
    );
  });
});

describe('deriveCampaignTotals', () => {
  it('sums stars + counts crowns + per-act buckets correctly', () => {
    const totals = deriveCampaignTotals({
      'world1-level-1': { stars: 3, crown: true },
      'world1-level-2': { stars: 2, crown: false },
      'world1-level-15': { stars: 3, crown: true },
      'world1-level-25': { stars: 1, crown: false },
    });
    expect(totals.totalStars).toBe(9);
    expect(totals.totalCrowns).toBe(2);
    expect(totals.perActCleared).toEqual({
      seedGrove: 2,
      moonvineStream: 1,
      oracleBloom: 1,
    });
  });

  it('ignores out-of-range or non-matching IDs', () => {
    const totals = deriveCampaignTotals({
      'world1-level-99': { stars: 3, crown: true },
      'world2-level-1': { stars: 2, crown: false },
      'world1-level-1': { stars: 1, crown: false },
    });
    expect(totals.totalStars).toBe(1);
    expect(totals.totalCrowns).toBe(0);
    expect(totals.perActCleared.seedGrove).toBe(1);
  });

  it('handles an empty levels map', () => {
    const totals = deriveCampaignTotals({});
    expect(totals).toEqual({
      totalStars: 0,
      totalCrowns: 0,
      perActCleared: { seedGrove: 0, moonvineStream: 0, oracleBloom: 0 },
    });
  });
});

describe('recordDuelWin / getDuelWinsCount', () => {
  beforeEach(() => {
    setStorage(new InMemoryStorage());
  });

  it('starts at 0 wins', () => {
    expect(getDuelWinsCount()).toBe(0);
  });

  it('increments for each unique roomId, ignores duplicates', () => {
    expect(recordDuelWin('room-a')).toBe(1);
    expect(recordDuelWin('room-b')).toBe(2);
    expect(recordDuelWin('room-a')).toBe(2); // dup, no bump
    expect(recordDuelWin('room-c')).toBe(3);
    expect(getDuelWinsCount()).toBe(3);
  });

  it('persists count across reads', () => {
    recordDuelWin('room-1');
    recordDuelWin('room-2');
    expect(getDuelWinsCount()).toBe(2);
    // Simulate "next session" — same storage, fresh read
    expect(getDuelWinsCount()).toBe(2);
  });
});
