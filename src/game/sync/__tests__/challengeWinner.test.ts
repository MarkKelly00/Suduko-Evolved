import { computeChallengeWinner } from '../challengeWinner';

describe('computeChallengeWinner', () => {
  const A = 'user-a';
  const B = 'user-b';

  const make = (
    score: number,
    timeSeconds: number,
    mistakes: number,
    hints: number,
  ) => ({ score, timeSeconds, mistakes, hints });

  it('higher score wins', () => {
    expect(computeChallengeWinner(make(1000, 60, 0, 0), make(800, 50, 0, 0), A, B)).toBe(A);
    expect(computeChallengeWinner(make(800, 50, 0, 0), make(1000, 60, 0, 0), A, B)).toBe(B);
  });

  it('on tied score, lower time wins', () => {
    expect(computeChallengeWinner(make(1000, 60, 5, 5), make(1000, 90, 0, 0), A, B)).toBe(A);
    expect(computeChallengeWinner(make(1000, 90, 0, 0), make(1000, 60, 5, 5), A, B)).toBe(B);
  });

  it('on tied score and time, fewer mistakes wins', () => {
    expect(computeChallengeWinner(make(1000, 60, 0, 9), make(1000, 60, 5, 0), A, B)).toBe(A);
    expect(computeChallengeWinner(make(1000, 60, 5, 0), make(1000, 60, 0, 9), A, B)).toBe(B);
  });

  it('on tied score, time, mistakes, fewer hints wins', () => {
    expect(computeChallengeWinner(make(1000, 60, 1, 0), make(1000, 60, 1, 3), A, B)).toBe(A);
    expect(computeChallengeWinner(make(1000, 60, 1, 3), make(1000, 60, 1, 0), A, B)).toBe(B);
  });

  it('returns null on full draw', () => {
    expect(computeChallengeWinner(make(1000, 60, 1, 2), make(1000, 60, 1, 2), A, B)).toBeNull();
  });

  it('handles zero scores', () => {
    expect(computeChallengeWinner(make(0, 999, 99, 99), make(0, 1, 99, 99), A, B)).toBe(B);
  });
});
