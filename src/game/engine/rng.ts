/**
 * Deterministic seedable RNG. Same input seed → identical sequence on every
 * JavaScript engine. Used for puzzle generation, deterministic UI sprinkles,
 * and (eventually) leaderboard validation.
 */

/** FNV-1a 32-bit hash → uint32. Stable across V8/JSC/Hermes. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // 32-bit FNV prime multiply
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit
  return h >>> 0;
}

/** Mulberry32 PRNG → returns a function yielding uniform numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function rngInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

/** In-place Fisher-Yates shuffle. Returns the same array for chainability. */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j]!;
    arr[j] = tmp!;
  }
  return arr;
}

/** Convenience: build an RNG straight from a string seed. */
export function rngFromSeed(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}
