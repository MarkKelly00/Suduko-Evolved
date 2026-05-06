import { hashSeed, mulberry32, rngFromSeed, shuffle } from '../rng';

describe('rng', () => {
  test('hashSeed is deterministic for the same input', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'));
    expect(hashSeed('a') === hashSeed('b')).toBe(false);
  });

  test('hashSeed returns a uint32', () => {
    const h = hashSeed('arbitrary string with mixed 123 chars');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });

  test('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b());
  });

  test('mulberry32 stays in [0,1)', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('rngFromSeed produces same sequence for same seed string', () => {
    const a = rngFromSeed('world1-level-01-v1');
    const b = rngFromSeed('world1-level-01-v1');
    for (let i = 0; i < 200; i++) expect(a()).toBe(b());
  });

  test('shuffle is deterministic and produces a permutation', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rngFromSeed('s'));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rngFromSeed('s'));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
