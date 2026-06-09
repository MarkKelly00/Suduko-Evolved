/**
 * Local calendar-day helpers for the daily play streak.
 *
 * We key the streak off the player's LOCAL day (not UTC) so it rolls over at
 * their midnight — which is what "day streak" intuitively means. Dates are
 * stored as `YYYY-MM-DD` strings, which compare lexicographically the same as
 * chronologically (handy for the cloud merge).
 */

/** Local `YYYY-MM-DD` for the given date (defaults to now). */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local `YYYY-MM-DD` for the day before `d`. */
export function yesterdayKey(d: Date = new Date()): string {
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return todayKey(prev);
}

/** True if `key` is today's or yesterday's local date — i.e. the streak is
 *  still "live" and hasn't lapsed. */
export function isTodayOrYesterday(
  key: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!key) return false;
  return key === todayKey(now) || key === yesterdayKey(now);
}

/**
 * The streak's value *as of now*: unchanged when the last play was today or
 * yesterday, else 0 — a missed day breaks the streak even before the next
 * play, so the displayed number is always honest without a background job.
 */
export function effectiveStreak(
  currentStreak: number,
  lastStreakDate: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!lastStreakDate) return 0;
  return isTodayOrYesterday(lastStreakDate, now) ? Math.max(0, currentStreak) : 0;
}

/**
 * Compute the streak after a play happens "now", from the previous streak and
 * the date it was last advanced:
 *   - same local day → unchanged (already counted today)
 *   - the next day   → +1
 *   - a gap or first play → reset to 1
 */
export function advanceStreak(
  prevStreak: number,
  lastStreakDate: string | null | undefined,
  now: Date = new Date(),
): { streak: number; date: string } {
  const today = todayKey(now);
  if (lastStreakDate === today) {
    return { streak: Math.max(1, prevStreak), date: today };
  }
  if (lastStreakDate === yesterdayKey(now)) {
    return { streak: Math.max(0, prevStreak) + 1, date: today };
  }
  return { streak: 1, date: today };
}
