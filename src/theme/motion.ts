/**
 * Animation duration + easing tokens. Use with Reanimated's
 * `withTiming({duration, easing})` and `withSpring`.
 *
 * Always check `useSettingsStore.reducedMotion` before kicking off
 * non-essential animations and prefer instant transitions when reduced motion
 * is enabled.
 */
import { Easing } from 'react-native-reanimated';

export const duration = {
  instant: 0,
  fast: 120,
  base: 220,
  slow: 360,
  cinematic: 600,
  hero: 900,
} as const;

export const easing = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  entrance: Easing.bezier(0.0, 0.0, 0.2, 1),
  exit: Easing.bezier(0.4, 0.0, 1, 1),
  emphasized: Easing.bezier(0.2, 0.0, 0.0, 1),
  premium: Easing.bezier(0.16, 1, 0.3, 1), // gentle overshoot-feel
};

export const spring = {
  gentle: { damping: 18, stiffness: 140, mass: 1 },
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
  snappy: { damping: 22, stiffness: 280, mass: 1 },
} as const;
