/**
 * Motion tokens — mirror of /src/theme/motion.ts.
 * Durations are in seconds (framer-motion expects seconds).
 */
export const duration = {
  instant: 0,
  fast: 0.12,
  base: 0.22,
  slow: 0.36,
  cinematic: 0.6,
  hero: 0.9,
} as const;

export const easing = {
  standard: [0.4, 0.0, 0.2, 1] as const,
  entrance: [0.0, 0.0, 0.2, 1] as const,
  exit: [0.4, 0.0, 1, 1] as const,
  emphasized: [0.2, 0.0, 0.0, 1] as const,
  premium: [0.16, 1, 0.3, 1] as const, // gentle overshoot
};

export const spring = {
  gentle: { damping: 18, stiffness: 140, mass: 1 },
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
  snappy: { damping: 22, stiffness: 280, mass: 1 },
} as const;
