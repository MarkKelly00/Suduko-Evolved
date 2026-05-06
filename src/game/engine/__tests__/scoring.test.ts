import { calculateScore, calculateStars, calculateXP, SCORING } from '../scoring';

describe('calculateScore', () => {
  test('clean run hand-computed', () => {
    const breakdown = calculateScore({
      correctPlacements: 50,
      tallies: {
        rowsCompleted: 9,
        colsCompleted: 9,
        boxesCompleted: 9,
        numberSetsCompleted: 9,
        comboCount: 6,
      },
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 200,
      targetTimeSeconds: 360,
      streak: 50,
    });
    // base = 50 * 10 = 500
    // rowBonus = 9 * 50 = 450
    // colBonus = 9 * 50 = 450
    // boxBonus = 9 * 75 = 675
    // numberSetBonus = 9 * 100 = 900
    // comboBonus = 6 * 50 = 300
    // noMistakeBonus = 200
    // noHintBonus = 150
    // timeBonus = (360 - 200) * 2 = 320
    // subtotal = 500 + 450 + 450 + 675 + 900 + 300 + 200 + 150 + 320 = 3945
    // streakSteps = floor(50/5) = 10 → multiplier = min(2.0, 1 + 0.1*10) = 2.0
    // total = round(3945 * 2.0) = 7890
    expect(breakdown.base).toBe(500);
    expect(breakdown.rowBonus).toBe(450);
    expect(breakdown.colBonus).toBe(450);
    expect(breakdown.boxBonus).toBe(675);
    expect(breakdown.numberSetBonus).toBe(900);
    expect(breakdown.comboBonus).toBe(300);
    expect(breakdown.noMistakeBonus).toBe(SCORING.NO_MISTAKE_BONUS);
    expect(breakdown.noHintBonus).toBe(SCORING.NO_HINT_BONUS);
    expect(breakdown.timeBonus).toBe(320);
    expect(breakdown.streakMultiplier).toBe(2.0);
    expect(breakdown.total).toBe(7890);
  });

  test('mistakes-only run zeroes the no-mistake bonus and resets streak multiplier toward 1.0', () => {
    const breakdown = calculateScore({
      correctPlacements: 50,
      tallies: {
        rowsCompleted: 9,
        colsCompleted: 9,
        boxesCompleted: 9,
        numberSetsCompleted: 9,
        comboCount: 4,
      },
      mistakes: 3,
      hintsUsed: 0,
      elapsedSeconds: 400,
      targetTimeSeconds: 360,
      streak: 4, // < 5 → multiplier 1.0
    });
    expect(breakdown.noMistakeBonus).toBe(0);
    expect(breakdown.noHintBonus).toBe(SCORING.NO_HINT_BONUS);
    expect(breakdown.timeBonus).toBe(0); // ran over target
    expect(breakdown.streakMultiplier).toBe(1.0);
  });

  test('hints-only run zeroes the no-hint bonus', () => {
    const breakdown = calculateScore({
      correctPlacements: 50,
      tallies: {
        rowsCompleted: 9,
        colsCompleted: 9,
        boxesCompleted: 9,
        numberSetsCompleted: 9,
        comboCount: 0,
      },
      mistakes: 0,
      hintsUsed: 2,
      elapsedSeconds: 360,
      targetTimeSeconds: 360,
      streak: 0,
    });
    expect(breakdown.noMistakeBonus).toBe(SCORING.NO_MISTAKE_BONUS);
    expect(breakdown.noHintBonus).toBe(0);
    expect(breakdown.timeBonus).toBe(0); // exactly at target
  });

  test('streak multiplier caps at 2.0', () => {
    const breakdown = calculateScore({
      correctPlacements: 1,
      tallies: { rowsCompleted: 0, colsCompleted: 0, boxesCompleted: 0, numberSetsCompleted: 0, comboCount: 0 },
      mistakes: 1,
      hintsUsed: 1,
      elapsedSeconds: 1000,
      targetTimeSeconds: 360,
      streak: 9999,
    });
    expect(breakdown.streakMultiplier).toBe(2.0);
  });
});

describe('calculateStars', () => {
  const level = {
    twoStarThreshold: 1000,
    threeStarThreshold: 2000,
    targetTimeSeconds: 300,
  };

  test('1 star when below the two-star threshold', () => {
    const r = calculateStars({ scoreTotal: 999, level, mistakes: 0, hintsUsed: 0, elapsedSeconds: 100 });
    expect(r.stars).toBe(1);
    expect(r.crown).toBe(false);
  });

  test('2 stars at exactly twoStarThreshold', () => {
    const r = calculateStars({ scoreTotal: 1000, level, mistakes: 0, hintsUsed: 0, elapsedSeconds: 100 });
    expect(r.stars).toBe(2);
  });

  test('3 stars at exactly threeStarThreshold', () => {
    const r = calculateStars({ scoreTotal: 2000, level, mistakes: 0, hintsUsed: 0, elapsedSeconds: 100 });
    expect(r.stars).toBe(3);
  });

  test('crown only granted when 3 stars + 0 mistakes + 0 hints + within target time', () => {
    expect(calculateStars({ scoreTotal: 2000, level, mistakes: 0, hintsUsed: 0, elapsedSeconds: 300 }).crown).toBe(true);
    // 1 second over target — no crown
    expect(calculateStars({ scoreTotal: 2000, level, mistakes: 0, hintsUsed: 0, elapsedSeconds: 301 }).crown).toBe(false);
    // mistake disqualifies
    expect(calculateStars({ scoreTotal: 2000, level, mistakes: 1, hintsUsed: 0, elapsedSeconds: 100 }).crown).toBe(false);
    // hint disqualifies
    expect(calculateStars({ scoreTotal: 2000, level, mistakes: 0, hintsUsed: 1, elapsedSeconds: 100 }).crown).toBe(false);
    // 2 stars cannot be crowned
    expect(calculateStars({ scoreTotal: 1500, level, mistakes: 0, hintsUsed: 0, elapsedSeconds: 100 }).crown).toBe(false);
  });
});

describe('calculateXP', () => {
  test('XP is score/10 + stars*25 + crown bonus', () => {
    expect(calculateXP({ scoreTotal: 1000, stars: 1, crown: false })).toBe(100 + 25);
    expect(calculateXP({ scoreTotal: 1000, stars: 2, crown: false })).toBe(100 + 50);
    expect(calculateXP({ scoreTotal: 1000, stars: 3, crown: false })).toBe(100 + 75);
    expect(calculateXP({ scoreTotal: 1000, stars: 3, crown: true })).toBe(100 + 75 + 50);
  });

  test('clamps negative scoreTotal to 0', () => {
    expect(calculateXP({ scoreTotal: -50, stars: 1, crown: false })).toBe(25);
  });
});
