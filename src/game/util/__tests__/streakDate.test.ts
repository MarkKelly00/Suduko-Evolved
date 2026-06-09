import {
  todayKey,
  yesterdayKey,
  isTodayOrYesterday,
  effectiveStreak,
  advanceStreak,
} from '@/game/util/streakDate';

// Fixed local "now" — noon on 2026-06-08 — so the calendar math is
// deterministic regardless of the machine's clock/timezone.
const NOW = new Date(2026, 5, 8, 12, 0, 0); // month index 5 = June
const TODAY = '2026-06-08';
const YESTERDAY = '2026-06-07';
const TWO_DAYS_AGO = '2026-06-06';

describe('streakDate keys', () => {
  it('formats local today/yesterday as YYYY-MM-DD', () => {
    expect(todayKey(NOW)).toBe(TODAY);
    expect(yesterdayKey(NOW)).toBe(YESTERDAY);
  });

  it('handles month boundaries for yesterday', () => {
    expect(yesterdayKey(new Date(2026, 6, 1, 9, 0, 0))).toBe('2026-06-30');
  });

  it('isTodayOrYesterday is true only for today/yesterday', () => {
    expect(isTodayOrYesterday(TODAY, NOW)).toBe(true);
    expect(isTodayOrYesterday(YESTERDAY, NOW)).toBe(true);
    expect(isTodayOrYesterday(TWO_DAYS_AGO, NOW)).toBe(false);
    expect(isTodayOrYesterday(null, NOW)).toBe(false);
  });
});

describe('advanceStreak', () => {
  it('starts a fresh streak at 1 (no prior date)', () => {
    expect(advanceStreak(0, null, NOW)).toEqual({ streak: 1, date: TODAY });
  });

  it('does not double-count a second play on the same day', () => {
    expect(advanceStreak(5, TODAY, NOW)).toEqual({ streak: 5, date: TODAY });
  });

  it('increments on a consecutive day', () => {
    expect(advanceStreak(5, YESTERDAY, NOW)).toEqual({ streak: 6, date: TODAY });
  });

  it('resets to 1 after a missed day', () => {
    expect(advanceStreak(5, TWO_DAYS_AGO, NOW)).toEqual({ streak: 1, date: TODAY });
  });
});

describe('effectiveStreak', () => {
  it('shows the streak while still live (today or yesterday)', () => {
    expect(effectiveStreak(5, TODAY, NOW)).toBe(5);
    expect(effectiveStreak(5, YESTERDAY, NOW)).toBe(5);
  });

  it('reads 0 once the streak has lapsed or was never started', () => {
    expect(effectiveStreak(5, TWO_DAYS_AGO, NOW)).toBe(0);
    expect(effectiveStreak(5, null, NOW)).toBe(0);
  });
});
