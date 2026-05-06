/**
 * Lightweight wrapper around the engine's deterministic RNG, exposed at the UI
 * layer for cosmetic randomness (placement of map decorations, idle particle
 * jitter, etc.) that should still be reproducible across reloads.
 */
export { hashSeed, mulberry32, rngInt, shuffle } from '@/game/engine/rng';
